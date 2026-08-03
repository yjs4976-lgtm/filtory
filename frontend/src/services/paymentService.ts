import { apiClient } from "./apiClient"
import type { BillingPrepareResponse, BillingProfileSummary, InitialChargeResponse, PaidSubscriptionSummary, PaymentSummary } from "@/types/payment"

export const paymentFeatureEnabled = process.env.NEXT_PUBLIC_PAYMENT_ENABLED === "true"

export const paymentService = {
  async prepareBillingAuth() {
    return (await apiClient<BillingPrepareResponse>("/api/payments/billing/prepare", { method: "POST", auth: true })).data
  },
  async confirmBillingAuth(authKey: string, customerKey: string) {
    return (await apiClient<BillingProfileSummary>("/api/payments/billing/confirm", {
      method: "POST", auth: true, body: { authKey, customerKey },
    })).data
  },
  async chargeInitialSubscription() {
    // 금액·상품·회원 식별자는 서버가 인증 세션과 DB 상품에서 결정한다.
    return (await apiClient<InitialChargeResponse>("/api/payments/subscriptions/charge", { method: "POST", auth: true })).data
  },
  async getPaymentSummary() {
    return (await apiClient<PaymentSummary>("/api/payments/me", { auth: true })).data
  },
  async cancelSubscription() {
    return (await apiClient<PaidSubscriptionSummary>("/api/payments/subscriptions/cancel", { method: "POST", auth: true })).data
  },
}
