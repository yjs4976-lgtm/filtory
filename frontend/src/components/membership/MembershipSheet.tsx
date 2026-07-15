"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import { AlertCircle, ArrowLeft, Check, LoaderCircle, X } from "lucide-react"
import { useRouter } from "next/navigation"
import styles from "@/styles/App.module.css"
import { useMembership } from "@/context/MembershipContext"
import { ROUTES } from "@/lib/routes"

type Props = {
  open: boolean
  variant: "benefits" | "limit"
  isRewardLoading?: boolean
  onClose: () => void
  onWatchAd?: () => void
}

type PlusModalStep = "overview" | "checkout" | "processing" | "complete" | "error"

const benefits = [
  ["01", "DETAIL", "광고 의심 근거와", "리뷰별 판단 내용을 자세히 확인"],
  ["02", "ASK", "분석 결과에서 궁금한 내용을", "AI에게 이어서 질문"],
  ["03", "ARCHIVE", "분석 기록을 장기 보관하고", "PDF 리포트로 저장"],
] as const

function formatBillingDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Seoul" }).format(new Date(value))
}

function nextMonthFromToday() {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  return date.toISOString()
}

export function MembershipSheet({ open, variant, isRewardLoading = false, onClose, onWatchAd }: Props) {
  const router = useRouter()
  const sheetRef = useRef<HTMLElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const agreementId = useId()
  const { formattedResetDate, startPlusPurchase, entitlement } = useMembership()
  const [step, setStep] = useState<PlusModalStep>("overview")
  const [agreed, setAgreed] = useState(false)
  const [agreementError, setAgreementError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [completedBillingDate, setCompletedBillingDate] = useState<string | null>(null)

  const isLimit = variant === "limit"
  const expectedBillingDate = formatBillingDate(nextMonthFromToday())

  const closeSheet = useCallback(() => {
    setStep("overview")
    setAgreed(false)
    setAgreementError(false)
    setErrorMessage("")
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.requestAnimationFrame(() => sheetRef.current?.querySelector<HTMLElement>("button")?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && step !== "processing") closeSheet()
      if (event.key !== "Tab" || !sheetRef.current) return
      const focusable = [...sheetRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled])')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown) }
  }, [closeSheet, open, step])

  async function purchase() {
    if (!agreed) { setAgreementError(true); document.getElementById(agreementId)?.focus(); return }
    if (step === "processing") return
    setAgreementError(false)
    setStep("processing")
    try {
      const next = await startPlusPurchase()
      setCompletedBillingDate(next.currentPeriodEnd ?? nextMonthFromToday())
      setStep("complete")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.")
      setStep("error")
    }
  }

  function closeAndGo(path: string) { closeSheet(); router.push(path) }

  if (!open) return null
  return (
    <div className={styles.membershipBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && step !== "processing" && closeSheet()}>
      <section ref={sheetRef} className={`${styles.membershipSheet} ${styles.plusMembershipSheet}`} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <span className={styles.sheetHandle} aria-hidden="true" />
        <button type="button" className={styles.membershipClose} disabled={step === "processing"} onClick={closeSheet} aria-label="멤버십 안내 닫기"><X /></button>

        <div key={step} className={styles.plusStep}>
          {step === "overview" && <>
            <header className={styles.plusHero}>
              <p className={styles.membershipEyebrow}>FILTORY PLUS</p>
              <h2 id={titleId}>{isLimit ? "이번 달 무료 상세 분석을 모두 사용했어요" : <>더 깊이 보고,<br />더 확실하게 선택하세요.</>}</h2>
              <p id={descriptionId}>{isLimit ? <>기본 신뢰도 점수와 간단한 요약은 계속 볼 수 있어요. {formattedResetDate}부터 무료 상세 분석 5회가 다시 제공됩니다.</> : <>리뷰의 광고 의심 근거부터 후속 질문과 리포트까지 한곳에서 확인하세요.</>}</p>
              <div className={styles.plusPrice}><strong>₩4,900</strong><span>월간 구독 · 언제든 해지 가능</span></div>
            </header>
            <ol className={styles.plusBenefitList}>{benefits.map(([number, keyword, line1, line2]) => <li key={number}><span>{number}</span><div><small>{keyword}</small><p>{line1}<br />{line2}</p></div></li>)}</ol>
            <p className={styles.plusIncluded}>AI 후속 질문 · 월 상세 분석 30회 · 스폰서 콘텐츠 제거 포함</p>
            <div className={styles.membershipActions}>
              <button type="button" className={styles.plusPrimaryButton} onClick={() => setStep("checkout")}>월 4,900원으로 시작하기</button>
              {isLimit && <button type="button" className={styles.secondaryButton} disabled={isRewardLoading} onClick={onWatchAd}>{isRewardLoading ? "광고를 불러오는 중…" : "광고 보고 상세 분석 1회 받기"}</button>}
              <button type="button" className={styles.membershipLaterButton} onClick={closeSheet}>무료 기능으로 계속하기</button>
              <small className={styles.membershipCancelAnytime}>매월 자동 갱신되며 언제든 해지할 수 있습니다.</small>
            </div>
          </>}

          {step === "checkout" && <>
            <button type="button" className={styles.plusBackButton} onClick={() => setStep("overview")}><ArrowLeft aria-hidden="true" /> 결제 정보 확인</button>
            <h2 id={titleId} className={styles.plusCheckoutTitle}>Filtory Plus 월간 멤버십</h2>
            <p id={descriptionId} className={styles.plusCheckoutSummary}>상세 분석 · AI 후속 질문 · 리포트 저장</p>
            <dl className={styles.plusCheckoutDetails}>
              <div><dt>오늘 결제 금액</dt><dd>₩4,900</dd></div>
              <div><dt>다음 결제 예정일</dt><dd>{expectedBillingDate}</dd></div>
              <div><dt>결제 수단</dt><dd>Google Play 결제 <small>mock</small></dd></div>
            </dl>
            <div className={styles.plusBillingNotice}><p>매월 4,900원이 자동으로 결제됩니다.</p><p>다음 결제 예정일 전까지 언제든 구독을 해지할 수 있습니다.</p></div>
            <label className={`${styles.plusAgreement} ${agreementError ? styles.plusAgreementError : ""}`} htmlFor={agreementId}>
              <input id={agreementId} type="checkbox" checked={agreed} onChange={(event) => { setAgreed(event.target.checked); setAgreementError(false) }} />
              <span>정기 결제와 이용 조건을 확인했습니다.</span>
            </label>
            {agreementError && <p className={styles.plusInlineError} role="alert"><AlertCircle /> 결제를 계속하려면 필수 항목에 동의해주세요.</p>}
            <nav className={styles.plusLegalLinks} aria-label="결제 관련 정책"><a href={ROUTES.MYPAGE_TERMS}>이용약관</a><a href={ROUTES.MYPAGE_PRIVACY}>개인정보 처리방침</a></nav>
            <button type="button" className={styles.plusPrimaryButton} onClick={() => void purchase()}>₩4,900 결제하기</button>
          </>}

          {step === "processing" && <div className={styles.plusStatus} aria-live="polite" aria-busy="true">
            <LoaderCircle className={styles.plusSpinner} aria-hidden="true" /><p className={styles.membershipEyebrow}>FILTORY PLUS</p><h2 id={titleId}>결제를 안전하게 처리하고 있어요</h2><p id={descriptionId}>잠시만 기다려주세요. 이 창을 닫지 마세요.</p>
          </div>}

          {step === "complete" && <div className={styles.plusComplete}>
            <span className={styles.plusStatusIcon}><Check aria-hidden="true" /></span><p className={styles.membershipEyebrow}>WELCOME TO PLUS</p><h2 id={titleId}>Filtory Plus가 시작됐어요</h2><p id={descriptionId}>이제 광고 의심 근거와 AI 후속 질문을 더 깊이 이용할 수 있습니다.</p>
            <dl><dt>다음 결제 예정일</dt><dd>{formatBillingDate(completedBillingDate ?? entitlement.currentPeriodEnd ?? nextMonthFromToday())}</dd></dl>
            <div className={styles.membershipActions}><button type="button" className={styles.plusPrimaryButton} onClick={() => closeAndGo(ROUTES.ANALYZE)}>분석 시작하기</button><button type="button" className={styles.membershipLaterButton} onClick={() => closeAndGo(ROUTES.MYPAGE_MEMBERSHIP)}>구독 정보 확인</button></div>
          </div>}

          {step === "error" && <div className={styles.plusComplete} role="alert">
            <span className={`${styles.plusStatusIcon} ${styles.plusErrorIcon}`}><AlertCircle aria-hidden="true" /></span><p className={styles.membershipEyebrow}>PAYMENT NOT COMPLETED</p><h2 id={titleId}>결제를 완료하지 못했어요</h2><p id={descriptionId}>{errorMessage || "잠시 후 다시 시도해주세요."}<br />결제는 처리되지 않았습니다.</p>
            <div className={styles.membershipActions}><button type="button" className={styles.plusPrimaryButton} onClick={() => { setErrorMessage(""); setStep("checkout") }}>다시 시도하기</button><button type="button" className={styles.membershipLaterButton} onClick={() => setStep("overview")}>이전으로</button></div>
          </div>}
        </div>
      </section>
    </div>
  )
}
