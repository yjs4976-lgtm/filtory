"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { cancellationReasons } from "@/data/cancellationReasons"
import { useMembership } from "@/context/MembershipContext"
import styles from "@/styles/App.module.css"

type CancelStep = "idle" | "reason" | "confirm" | "complete"

export function SubscriptionManagement() {
  const { entitlement, usedCount, availableCount, formattedResetDate, scheduleCancellation } = useMembership()
  const [busy, setBusy] = useState<"cancel" | null>(null)
  const [step, setStep] = useState<CancelStep>("idle")
  const [reasonId, setReasonId] = useState("")
  const [feedback, setFeedback] = useState("")
  const isPlus = entitlement.plan === "PLUS"
  const cancelScheduled = entitlement.status === "CANCEL_SCHEDULED"
  const periodEnd = entitlement.currentPeriodEnd ? new Date(entitlement.currentPeriodEnd).toLocaleDateString("ko-KR") : "-"

  const cancel = async () => {
    if (busy) return; setBusy("cancel")
    try { await scheduleCancellation({ reasonId: reasonId || undefined, additionalFeedback: feedback || undefined, submittedAt: new Date().toISOString() }); setStep("complete") }
    finally { setBusy(null) }
  }

  return <div className={styles.subscriptionStack}>
    <section className={styles.subscriptionPlanCard}>
      <p className={styles.membershipEyebrow}>현재 이용 중인 플랜</p>
      <h1>{isPlus ? "Filtory Plus 테스트" : "Free"}</h1>
      <div className={styles.subscriptionUsage}><span>{isPlus ? "이번 달 상세 분석" : "이번 달 무료 상세 분석"}</span><strong>{usedCount} / {availableCount}회 사용</strong></div>
      {!isPlus && <p>다음 무료 분석 제공일 {formattedResetDate}<br />기본 분석 결과는 계속 이용할 수 있습니다.</p>}
      {isPlus && !cancelScheduled && <p>서버 테스트용 Plus 이용 기간 {periodEnd}까지<br />실제 결제나 자동 갱신은 진행되지 않습니다.</p>}
      {cancelScheduled && <div className={styles.subscriptionCancelScheduled}><strong>{periodEnd}까지 이용 가능</strong><span>이후 Free로 전환됩니다.</span></div>}
    </section>

    {!isPlus && <section className={styles.plusOverview}>
      <p className={styles.membershipEyebrow}>FILTORY PLUS · TEST GUIDE</p><h2>Plus는 현재 준비 중이에요</h2>
      <ul>{["Free는 월 상세 분석 5회", "테스트용 Plus는 월 상세 분석 30회", "점수와 AI 분석 기준은 두 플랜 모두 동일", "테스트 기간에는 실제 결제가 진행되지 않음"].map((item) => <li key={item}><Check />{item}</li>)}</ul>
      <p>Plus 제공 범위는 정식 출시 전 변경될 수 있어요.</p>
    </section>}

    {isPlus && !cancelScheduled && step === "idle" && <button type="button" className={styles.subscriptionCancelLink} onClick={() => setStep("reason")}>테스트 Plus 이용 종료</button>}
    {step === "reason" && <section className={styles.cancellationCard}><h2>테스트 Plus를 종료하려는 이유를 알려주세요</h2><p>보내주신 의견은 Filtory를 개선하는 데만 사용됩니다. 답변하지 않고 계속할 수도 있어요.</p><fieldset><legend className={styles.srOnly}>종료 사유</legend>{cancellationReasons.map(([id, label]) => <label key={id}><input type="radio" name="cancel-reason" value={id} checked={reasonId === id} onChange={() => setReasonId(id)} /><span>{label}</span></label>)}</fieldset>{reasonId === "other" && <label className={styles.cancellationFeedback}>조금 더 자세히 알려주세요. (선택)<textarea maxLength={300} value={feedback} onChange={(event) => setFeedback(event.target.value)} /><small>{feedback.length} / 300</small></label>}<small>이 답변은 광고 개인화, 분석 결과, 사용자 불이익 또는 기능 제한에 사용하지 않습니다.</small><div><button type="button" className={styles.secondaryButton} onClick={() => setStep("idle")}>계속 이용하기</button><button type="button" className={styles.primaryButton} onClick={() => setStep("confirm")}>{reasonId ? "다음" : "답변하지 않고 계속하기"}</button></div></section>}
    {step === "confirm" && <section className={styles.cancellationCard}><h2>테스트 Plus 이용을 종료할까요?</h2><p>현재 이용 기간이 끝나는 날까지 Plus 기능을 사용할 수 있습니다. 이후 Free로 전환되며 계정과 기존 분석 기록은 삭제되지 않습니다.</p><div><button type="button" className={styles.secondaryButton} onClick={() => setStep("idle")}>계속 이용하기</button><button type="button" className={styles.primaryButton} disabled={busy !== null} onClick={() => void cancel()}>{busy === "cancel" ? "이용 상태 확인 중…" : "테스트 이용 종료하기"}</button></div></section>}
    {step === "complete" && <section className={styles.cancellationCard}><h2>테스트 Plus 종료 요청을 반영했어요</h2><p>현재 이용 기간이 끝난 뒤 Free로 전환됩니다. 실제 결제나 환불은 발생하지 않습니다.</p><button type="button" className={styles.primaryButton} onClick={() => setStep("idle")}>이용 관리로 돌아가기</button></section>}
  </div>
}
