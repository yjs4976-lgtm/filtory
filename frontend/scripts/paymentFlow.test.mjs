import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

const root = path.resolve(import.meta.dirname, "..")
const source = fs.readFileSync(path.join(root, "src/lib/paymentFlow.ts"), "utf8")
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const cjsModule = { exports: {} }
new Function("exports", "module", js)(cjsModule.exports, cjsModule)
const { cancellationCopy, completePaymentCallback, performSubscriptionCancellation } = cjsModule.exports

const calls = []
const api = {
  getPaymentSummary: async () => (calls.push("summary"), { subscription: null, billingProfile: { status: "pending" } }),
  confirmBillingAuth: async (authKey, customerKey) => calls.push(`confirm:${authKey}:${customerKey}`),
  chargeInitialSubscription: async (...args) => (calls.push(`charge:${args.length}`), {}),
}
await completePaymentCallback(api, "auth", "customer", async () => { calls.push("refresh") })
assert.deepEqual(calls, ["summary", "confirm:auth:customer", "charge:0", "refresh"])

calls.length = 0
api.getPaymentSummary = async () => (calls.push("summary"), { subscription: null, billingProfile: { status: "active" } })
await completePaymentCallback(api, "auth", "customer", async () => { calls.push("refresh") })
assert.deepEqual(calls, ["summary", "charge:0", "refresh"])

for (const status of ["active", "cancel_scheduled", "grace_period"]) {
  calls.length = 0
  api.getPaymentSummary = async () => (calls.push("summary"), { subscription: { status }, billingProfile: { status: "active" } })
  await completePaymentCallback(api, "auth", "customer", async () => { calls.push("refresh") })
  assert.deepEqual(calls, ["summary", "refresh"])
}

calls.length = 0
let summaryCount = 0
api.getPaymentSummary = async () => {
  calls.push("summary")
  summaryCount += 1
  return { subscription: summaryCount === 1 ? null : { status: "active" }, billingProfile: { status: "active" } }
}
api.chargeInitialSubscription = async () => { calls.push("charge:0"); throw new Error("response lost") }
await completePaymentCallback(api, "auth", "customer", async () => { calls.push("refresh") })
assert.deepEqual(calls, ["summary", "charge:0", "summary", "refresh"])

calls.length = 0
api.getPaymentSummary = async () => (calls.push("summary"), { subscription: null, billingProfile: { status: "active" } })
const actualFailure = new Error("declined")
api.chargeInitialSubscription = async () => { calls.push("charge:0"); throw actualFailure }
await assert.rejects(() => completePaymentCallback(api, "auth", "customer", async () => { calls.push("refresh") }), (error) => error === actualFailure)
assert.deepEqual(calls, ["summary", "charge:0", "summary"])

await assert.rejects(() => performSubscriptionCancellation(async () => { throw new Error("cancel failed") }))

const realCopy = Object.values(cancellationCopy.real).join(" ")
for (const forbidden of ["테스트 Plus", "테스트 이용 종료", "실제 결제나 환불은 발생하지 않습니다"]) assert.doesNotMatch(realCopy, new RegExp(forbidden))
assert.match(Object.values(cancellationCopy.test).join(" "), /테스트 Plus/)

const contextSource = fs.readFileSync(path.join(root, "src/context/MembershipContext.tsx"), "utf8")
assert.match(contextSource, /if \(!paymentPurchaseEnabled\).*throw/)
assert.match(contextSource, /await import\("@tosspayments\/tosspayments-sdk"\)/)
assert.doesNotMatch(contextSource, /unknown as|js\.tosspayments\.com\/v2\/standard/)
assert.match(contextSource, /payment\(\{ customerKey: prepared\.customerKey \}\)/)
const successSource = fs.readFileSync(path.join(root, "src/app/payments/success/page.tsx"), "utf8")
assert.match(successSource, /if \(!paymentFeatureEnabled \|\| !authKey \|\| !customerKey\)/)
assert.match(successSource, /if \(startedRef\.current\) return/)
const serviceSource = fs.readFileSync(path.join(root, "src/services/paymentService.ts"), "utf8")
assert.match(serviceSource, /paymentPurchaseEnabled = paymentFeatureEnabled && paymentRenewalEnabled/)
assert.match(serviceSource, /subscriptions\/charge", \{ method: "POST", auth: true \}/)
assert.doesNotMatch(serviceSource, /subscriptions\/charge"[^\n]*(amount|productId|memberId)/)
const failSource = fs.readFileSync(path.join(root, "src/app/payments/fail/page.tsx"), "utf8")
assert.doesNotMatch(failSource, /dangerouslySetInnerHTML/)
const managementSource = fs.readFileSync(path.join(root, "src/components/membership/SubscriptionManagement.tsx"), "utf8")
assert.match(managementSource, /await performSubscriptionCancellation[\s\S]*setStep\("complete"\)[\s\S]*catch/)
assert.match(managementSource, /const isTossSubscription = entitlement\.provider === "TOSS"/)
assert.doesNotMatch(managementSource, /paymentFeatureEnabled && entitlement\.provider/)
