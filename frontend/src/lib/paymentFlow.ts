import type { paymentService } from "@/services/paymentService"

type PaymentApi = Pick<typeof paymentService, "getPaymentSummary" | "confirmBillingAuth" | "chargeInitialSubscription">

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "cancel_scheduled", "grace_period"])

export function hasActivePaidSubscription(status: string | null | undefined) {
  return ACTIVE_SUBSCRIPTION_STATUSES.has((status ?? "").toLowerCase())
}

export async function completePaymentCallback(
  api: PaymentApi,
  authKey: string,
  customerKey: string,
  refreshEntitlement: () => Promise<void>,
) {
  const summary = await api.getPaymentSummary()
  if (hasActivePaidSubscription(summary.subscription?.status)) {
    await refreshEntitlement()
    return
  }
  if (summary.billingProfile?.status !== "active") {
    await api.confirmBillingAuth(authKey, customerKey)
  }
  try {
    await api.chargeInitialSubscription()
  } catch (error) {
    // 승인 응답만 유실됐을 수 있으므로 서버 상태를 한 번 재조회한 뒤 실패를 확정한다.
    let recovered
    try {
      recovered = await api.getPaymentSummary()
    } catch {
      throw error
    }
    if (!hasActivePaidSubscription(recovered.subscription?.status)) throw error
  }
  await refreshEntitlement()
}

export const cancellationCopy = {
  real: {
    link: "Filtory Plus 구독 취소",
    reasonTitle: "Plus 구독을 취소하려는 이유를 알려주세요",
    confirmTitle: "Plus 자동 갱신을 중단할까요?",
    confirmBody: "현재 이용 기간 종료일까지 Plus를 이용할 수 있으며 다음 결제일부터 자동 결제가 진행되지 않습니다.",
    submit: "구독 취소 예약하기",
    completeTitle: "Plus 구독 취소를 예약했어요",
    completeBody: "이번 요청은 즉시 환불이 아니라 다음 결제 중단 예약입니다.",
  },
  test: {
    link: "테스트 Plus 이용 종료",
    reasonTitle: "테스트 Plus를 종료하려는 이유를 알려주세요",
    confirmTitle: "테스트 Plus 이용을 종료할까요?",
    confirmBody: "현재 이용 기간이 끝나는 날까지 Plus 기능을 사용할 수 있습니다. 이후 Free로 전환되며 계정과 기존 분석 기록은 삭제되지 않습니다.",
    submit: "테스트 이용 종료하기",
    completeTitle: "테스트 Plus 종료 요청을 반영했어요",
    completeBody: "현재 이용 기간이 끝난 뒤 Free로 전환됩니다. 실제 결제나 환불은 발생하지 않습니다.",
  },
} as const

export async function performSubscriptionCancellation(action: () => Promise<void>) {
  // UI는 이 Promise가 성공한 뒤에만 완료 단계로 이동한다.
  await action()
}
