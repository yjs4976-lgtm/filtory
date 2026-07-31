export type PurchaseResult = { productId: string; purchaseReference: string; state: "PURCHASED" | "PENDING" | "CANCELLED" }
export interface BillingProvider { startSubscriptionPurchase(productId: string): Promise<PurchaseResult>; restorePurchases(): Promise<PurchaseResult[]>; openSubscriptionManagement(): Promise<void> }
