import { billingProducts } from "@/data/billingProducts"
import type { PurchaseResult } from "@/types/billing"
import type { CancellationFeedback, MembershipEntitlement } from "@/types/subscription"

const free = (userId: string): MembershipEntitlement => ({ userId, plan: "FREE", provider: null, status: "FREE", productId: null, currentPeriodStart: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, lastVerifiedAt: null })
const mockEntitlements = new Map<string, MembershipEntitlement>()
const entitlementKey = (userId: string) => `filtory:mock-entitlement:${userId}`

function readEntitlement(userId: string) {
  const cached = mockEntitlements.get(userId)
  if (cached) return cached
  if (typeof window === "undefined") return null
  try {
    const stored = JSON.parse(localStorage.getItem(entitlementKey(userId)) ?? "null") as MembershipEntitlement | null
    if (!stored || stored.userId !== userId || !stored.currentPeriodEnd || new Date(stored.currentPeriodEnd) <= new Date()) return null
    mockEntitlements.set(userId, stored)
    return stored
  } catch { return null }
}

function saveEntitlement(entitlement: MembershipEntitlement) {
  mockEntitlements.set(entitlement.userId, entitlement)
  if (typeof window !== "undefined") localStorage.setItem(entitlementKey(entitlement.userId), JSON.stringify(entitlement))
}

export const subscriptionService = {
  async getEntitlement(userId: string) {
    // TODO: GET /api/me/entitlement. The server response is the app/web source of truth.
    return readEntitlement(userId) ?? free(userId)
  },
  async verifyPurchase(userId: string, purchase: PurchaseResult) {
    // TODO: POST /api/billing/google-play/verify. Send the token over TLS and verify only on the server.
    if (purchase.state !== "PURCHASED" || purchase.productId !== billingProducts.plusMonthly.productId) return free(userId)
    const now = new Date(); const end = new Date(now); end.setMonth(end.getMonth() + 1)
    const entitlement: MembershipEntitlement = { userId, plan: "PLUS", provider: "MOCK", status: "ACTIVE", productId: purchase.productId, purchaseTokenReference: "mock-reference-redacted", currentPeriodStart: now.toISOString(), currentPeriodEnd: end.toISOString(), cancelAtPeriodEnd: false, lastVerifiedAt: now.toISOString() }
    saveEntitlement(entitlement)
    return entitlement
  },
  async restore(userId: string, purchases: PurchaseResult[]) {
    // TODO: POST /api/billing/google-play/restore and validate current status/expiry server-side.
    const active = purchases.find((purchase) => purchase.state === "PURCHASED" && purchase.productId === billingProducts.plusMonthly.productId)
    return active ? this.verifyPurchase(userId, active) : null
  },
  async submitCancellationFeedback(feedback: CancellationFeedback) { void feedback; /* TODO: POST /api/subscription/cancel-feedback */ },
  async scheduleMockCancellation(userId: string) {
    const current = readEntitlement(userId)
    if (!current || current.provider !== "MOCK" || current.plan !== "PLUS") return current ?? free(userId)
    const next = { ...current, status: "CANCEL_SCHEDULED" as const, cancelAtPeriodEnd: true }
    saveEntitlement(next); return next
  },
}
