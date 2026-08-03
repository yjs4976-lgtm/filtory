export type SubscriptionPlan = "FREE" | "PLUS"
export type SubscriptionStatus = "FREE" | "ACTIVE" | "CANCEL_SCHEDULED" | "GRACE_PERIOD" | "PAYMENT_PENDING" | "ON_HOLD" | "EXPIRED" | "REFUNDED" | "VERIFICATION_REQUIRED"
export type PaymentProvider = "GOOGLE_PLAY" | "TOSS" | "ADMIN" | "MOCK"

export interface MembershipEntitlement {
  userId: string
  plan: SubscriptionPlan
  provider: PaymentProvider | null
  status: SubscriptionStatus
  productId: string | null
  purchaseTokenReference?: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  lastVerifiedAt: string | null
  baseLimit?: number
}

export interface CancellationFeedback { reasonId?: string; additionalFeedback?: string; submittedAt?: string }
