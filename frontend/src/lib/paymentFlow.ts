import type { paymentService } from "@/services/paymentService"

type PaymentApi = Pick<typeof paymentService, "getPaymentSummary" | "confirmBillingAuth" | "chargeInitialSubscription">

export async function completePaymentCallback(
  api: PaymentApi,
  authKey: string,
  customerKey: string,
  refreshEntitlement: () => Promise<void>,
) {
  const summary = await api.getPaymentSummary()
  if (summary.billingProfile?.status !== "active") {
    await api.confirmBillingAuth(authKey, customerKey)
  }
  await api.chargeInitialSubscription()
  await refreshEntitlement()
}
