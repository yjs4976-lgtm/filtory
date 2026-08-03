import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

const root = path.resolve(import.meta.dirname, "..")
const source = fs.readFileSync(path.join(root, "src/lib/paymentFlow.ts"), "utf8")
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const cjsModule = { exports: {} }
new Function("exports", "module", js)(cjsModule.exports, cjsModule)
const { completePaymentCallback } = cjsModule.exports

const calls = []
const api = {
  getPaymentSummary: async () => (calls.push("summary"), { billingProfile: { status: "pending" } }),
  confirmBillingAuth: async (authKey, customerKey) => calls.push(`confirm:${authKey}:${customerKey}`),
  chargeInitialSubscription: async (...args) => (calls.push(`charge:${args.length}`), {}),
}
await completePaymentCallback(api, "auth", "customer", async () => { calls.push("refresh") })
assert.deepEqual(calls, ["summary", "confirm:auth:customer", "charge:0", "refresh"])

calls.length = 0
api.getPaymentSummary = async () => (calls.push("summary"), { billingProfile: { status: "active" } })
await completePaymentCallback(api, "auth", "customer", async () => { calls.push("refresh") })
assert.deepEqual(calls, ["summary", "charge:0", "refresh"])

const contextSource = fs.readFileSync(path.join(root, "src/context/MembershipContext.tsx"), "utf8")
assert.match(contextSource, /if \(!paymentFeatureEnabled\).*throw/)
assert.match(contextSource, /await import\("@tosspayments\/payment-sdk"\)/)
assert.match(contextSource, /payment\(\{ customerKey: prepared\.customerKey \}\)/)
const successSource = fs.readFileSync(path.join(root, "src/app/payments/success/page.tsx"), "utf8")
assert.match(successSource, /if \(!paymentFeatureEnabled \|\| !authKey \|\| !customerKey\)/)
assert.match(successSource, /if \(startedRef\.current\) return/)
const serviceSource = fs.readFileSync(path.join(root, "src/services/paymentService.ts"), "utf8")
assert.match(serviceSource, /subscriptions\/charge", \{ method: "POST", auth: true \}/)
assert.doesNotMatch(serviceSource, /subscriptions\/charge"[^\n]*(amount|productId|memberId)/)
const failSource = fs.readFileSync(path.join(root, "src/app/payments/fail/page.tsx"), "utf8")
assert.doesNotMatch(failSource, /dangerouslySetInnerHTML/)
