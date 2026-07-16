import type { BillingProvider, PurchaseResult } from "@/types/billing"

class MockBillingProvider implements BillingProvider {
  private purchases: PurchaseResult[] = []
  async startSubscriptionPurchase(productId: string) {
    await new Promise((resolve) => window.setTimeout(resolve, 500))
    const purchase = { productId, purchaseReference: `mock-${crypto.randomUUID()}`, state: "PURCHASED" as const }
    this.purchases = [purchase]
    return purchase
  }
  async restorePurchases() { await new Promise((resolve) => window.setTimeout(resolve, 400)); return [...this.purchases] }
  async openSubscriptionManagement() { /* TODO: Open Google Play subscription management after packaging is selected. */ }
}

// No TWA/Capacitor/native wrapper is present, so no Play SDK is installed.
export const billingProvider: BillingProvider = new MockBillingProvider()
