"use client"

import { useState } from "react"
import { Check, RefreshCw } from "lucide-react"
import { cancellationReasons } from "@/data/cancellationReasons"
import { billingProducts } from "@/data/billingProducts"
import { useMembership } from "@/context/MembershipContext"
import { useToast } from "@/hooks/useToast"
import styles from "@/styles/App.module.css"

type CancelStep = "idle" | "reason" | "confirm" | "complete"

export function SubscriptionManagement() {
  const { entitlement, usedCount, availableCount, formattedResetDate, startPlusPurchase, restorePurchases, scheduleCancellation } = useMembership()
  const { showToast } = useToast()
  const [busy, setBusy] = useState<"purchase" | "restore" | "cancel" | null>(null)
  const [step, setStep] = useState<CancelStep>("idle")
  const [reasonId, setReasonId] = useState("")
  const [feedback, setFeedback] = useState("")
  const isPlus = entitlement.plan === "PLUS"
  const cancelScheduled = entitlement.status === "CANCEL_SCHEDULED"
  const periodEnd = entitlement.currentPeriodEnd ? new Date(entitlement.currentPeriodEnd).toLocaleDateString("ko-KR") : "-"

  const purchase = async () => {
    if (busy) return; setBusy("purchase")
    try { await startPlusPurchase(); showToast({ title: "서버 검증이 완료되어 Filtory Plus가 활성화되었습니다.", tone: "success" }) }
    catch (error) { showToast({ title: error instanceof Error ? error.message : "결제 정보를 확인하지 못했어요.", description: "구매 복원 또는 다시 확인을 이용해 주세요.", tone: "info" }) }
    finally { setBusy(null) }
  }
  const restore = async () => {
    if (busy) return; setBusy("restore")
    try { const result = await restorePurchases(); showToast({ title: result ? "구매 내역이 복원되었습니다." : "복원할 활성 구독이 없어요.", tone: result ? "success" : "info" }) }
    catch { showToast({ title: "구매 내역을 확인하지 못했어요.", tone: "info" }) } finally { setBusy(null) }
  }
  const cancel = async () => {
    if (busy) return; setBusy("cancel")
    try { await scheduleCancellation({ reasonId: reasonId || undefined, additionalFeedback: feedback || undefined, submittedAt: new Date().toISOString() }); setStep("complete") }
    finally { setBusy(null) }
  }

  return <div className={styles.subscriptionStack}>
    <section className={styles.subscriptionPlanCard}>
      <p className={styles.membershipEyebrow}>현재 이용 중인 플랜</p>
      <h1>{isPlus ? "Filtory Plus" : "Free"}</h1>
      {isPlus && <strong>{billingProducts.plusMonthly.displayPrice}</strong>}
      <div className={styles.subscriptionUsage}><span>{isPlus ? "이번 달 상세 분석" : "이번 달 무료 상세 분석"}</span><strong>{usedCount} / {availableCount}회 사용</strong></div>
      {!isPlus && <p>다음 무료 분석 제공일 {formattedResetDate}<br />기본 분석 결과는 계속 이용할 수 있습니다.</p>}
      {isPlus && !cancelScheduled && <p>다음 결제일 {periodEnd}</p>}
      {cancelScheduled && <div className={styles.subscriptionCancelScheduled}><strong>{periodEnd}까지 이용 가능</strong><span>이후 Free로 전환됩니다.</span></div>}
    </section>

    {!isPlus && <section className={styles.plusOverview}>
      <p className={styles.membershipEyebrow}>FILTORY PLUS</p><h2>점수만 보는 것을 넘어,<br />의심되는 리뷰의 근거까지 확인하세요.</h2><strong>{billingProducts.plusMonthly.displayPrice}</strong>
      <ul>{["더 깊은 상세 분석과 리뷰별 판단 근거", "분석 결과 AI 후속 질문 확대", "기록 장기 보관과 PDF 리포트", "월 상세 분석 30회와 Partnered Insight 제거"].map((item) => <li key={item}><Check />{item}</li>)}</ul>
      <button type="button" className={styles.primaryButton} disabled={busy !== null} onClick={() => void purchase()}>{busy === "purchase" ? "구매 정보를 확인하는 중…" : "Plus 시작하기"}</button>
      <p>언제든지 해지할 수 있습니다.</p>
    </section>}

    <section className={styles.purchaseRestoreCard}><div><RefreshCw /><span><strong>구매 복원</strong><small>기기를 변경했거나 앱을 다시 설치했다면 기존 Google Play 구매를 복원할 수 있어요.</small></span></div><button type="button" disabled={busy !== null} onClick={() => void restore()}>{busy === "restore" ? "확인 중…" : "구매 복원"}</button></section>

    {isPlus && !cancelScheduled && step === "idle" && <button type="button" className={styles.subscriptionCancelLink} onClick={() => setStep("reason")}>Plus 구독 해지</button>}
    {step === "reason" && <section className={styles.cancellationCard}><h2>Plus를 해지하려는 이유를 알려주세요</h2><p>보내주신 의견은 Filtory를 개선하는 데만 사용됩니다. 답변하지 않고 해지를 계속할 수도 있어요.</p><fieldset><legend className={styles.srOnly}>해지 사유</legend>{cancellationReasons.map(([id, label]) => <label key={id}><input type="radio" name="cancel-reason" value={id} checked={reasonId === id} onChange={() => setReasonId(id)} /><span>{label}</span></label>)}</fieldset>{reasonId === "other" && <label className={styles.cancellationFeedback}>조금 더 자세히 알려주세요. (선택)<textarea maxLength={300} value={feedback} onChange={(event) => setFeedback(event.target.value)} /><small>{feedback.length} / 300</small></label>}<small>이 답변은 광고 개인화, 분석 결과, 사용자 불이익 또는 기능 제한에 사용하지 않습니다.</small><div><button type="button" className={styles.secondaryButton} onClick={() => setStep("idle")}>Plus 계속 이용하기</button><button type="button" className={styles.primaryButton} onClick={() => setStep("confirm")}>{reasonId ? "다음" : "답변하지 않고 계속하기"}</button></div></section>}
    {step === "confirm" && <section className={styles.cancellationCard}><h2>Plus 구독을 해지할까요?</h2><p>현재 이용 기간이 끝나는 날까지 Plus 기능을 계속 사용할 수 있습니다. 이후 Free로 전환되며 계정과 기존 분석 기록은 삭제되지 않습니다.</p><div><button type="button" className={styles.secondaryButton} onClick={() => setStep("idle")}>Plus 계속 이용하기</button><button type="button" className={styles.primaryButton} disabled={busy !== null} onClick={() => void cancel()}>{busy === "cancel" ? "구독 상태 확인 중…" : "구독 해지하기"}</button></div></section>}
    {step === "complete" && <section className={styles.cancellationCard}><h2>Plus 구독 해지 절차를 완료했어요</h2><p>현재 결제 기간이 끝날 때까지 Plus 기능을 계속 사용할 수 있어요. 이후 Free로 전환되며 필요할 때 언제든 Plus를 다시 시작할 수 있어요.</p><button type="button" className={styles.primaryButton} onClick={() => setStep("idle")}>구독 관리로 돌아가기</button></section>}
  </div>
}
