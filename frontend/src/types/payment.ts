export interface BillingProduct {
  id: number
  planCode: string
  provider: "TOSS"
  providerProductId: string
  amount: number
  currency: string
  billingInterval: string
}

export interface BillingProfileSummary {
  provider: "TOSS"
  status: "pending" | "active" | "revoked" | "verification_required"
  cardCompany: string | null
  cardNumberMasked: string | null
  authenticatedAt: string | null
  lastVerifiedAt: string | null
}

export interface PaymentTransactionSummary {
  id: number
  subscriptionId: number | null
  provider: "TOSS"
  transactionType: string
  orderId: string
  amount: number
  currency: string
  status: string
  requestedAt: string | null
  approvedAt: string | null
  canceledAt: string | null
  failureCode: string | null
  failureMessage: string | null
}

export interface PaidSubscriptionSummary {
  id: number
  status: string
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
}

export interface PaymentSummary {
  paymentEnabled: boolean
  renewalEnabled: boolean
  subscription: PaidSubscriptionSummary | null
  billingProfile: BillingProfileSummary | null
  transactions: PaymentTransactionSummary[]
}

export interface BillingPrepareResponse {
  clientKey: string
  customerKey: string
  product: BillingProduct
  successUrl: string
  failUrl: string
}

export interface InitialChargeResponse {
  subscription: PaidSubscriptionSummary
  payment: PaymentTransactionSummary
}
