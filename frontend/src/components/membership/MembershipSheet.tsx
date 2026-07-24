"use client"

import { useCallback, useEffect, useId, useRef } from "react"
import { X } from "lucide-react"
import styles from "@/styles/App.module.css"

type Props = {
  open: boolean
  variant: "benefits" | "limit"
  isRewardLoading?: boolean
  onClose: () => void
  onWatchAd?: () => void
}

const benefits = [
  ["01", "FREE", "월 상세 분석 5회", "무료 기능으로 계속 이용할 수 있어요"],
  ["02", "PLUS", "월 상세 분석 30회", "현재 서버 테스트 기준이에요"],
  ["03", "SAME QUALITY", "점수와 AI 분석 기준은", "Free와 Plus 모두 동일해요"],
] as const

export function MembershipSheet({ open, variant, isRewardLoading = false, onClose, onWatchAd }: Props) {
  const sheetRef = useRef<HTMLElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const isLimit = variant === "limit"

  const closeSheet = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.requestAnimationFrame(() => sheetRef.current?.querySelector<HTMLElement>("button")?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSheet()
      if (event.key !== "Tab" || !sheetRef.current) return
      const focusable = [...sheetRef.current.querySelectorAll<HTMLElement>("button:not([disabled])")]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown) }
  }, [closeSheet, open])

  if (!open) return null
  return (
    <div className={styles.membershipBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeSheet()}>
      <section ref={sheetRef} className={`${styles.membershipSheet} ${styles.plusMembershipSheet}`} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <span className={styles.sheetHandle} aria-hidden="true" />
        <button type="button" className={styles.membershipClose} onClick={closeSheet} aria-label="Plus 안내 닫기"><X /></button>

        <div className={styles.plusStep}>
          <header className={styles.plusHero}>
            <p className={styles.membershipEyebrow}>FILTORY PLUS · TEST GUIDE</p>
            <h2 id={titleId}>{isLimit ? "이번 달 Free 상세 분석을 모두 사용했어요" : "Plus는 현재 준비 중이에요"}</h2>
            <p id={descriptionId}>{isLimit ? "Free는 월 5회 상세 분석을 제공하며, 기본 점수와 요약은 계속 확인할 수 있어요." : "Plus는 분석 품질을 바꾸는 기능이 아니라, 상세 분석을 더 자주 이용하기 위한 준비 중인 기능이에요."}</p>
          </header>

          <section className={styles.plusTestNotice} aria-label="테스트 기간 안내">
            <strong>현재는 테스트용 Plus 안내입니다</strong>
            <p>테스트 기간에는 실제 구매, 카드 등록 또는 자동 결제가 진행되지 않아요.</p>
          </section>

          <ol className={styles.plusBenefitList}>{benefits.map(([number, keyword, line1, line2]) => <li key={number}><span>{number}</span><div><small>{keyword}</small><p>{line1}<br />{line2}</p></div></li>)}</ol>
          <p className={styles.plusIncluded}>Plus 제공 범위는 정식 출시 전 변경될 수 있어요.</p>
          <div className={styles.membershipActions}>
            {isLimit && <button type="button" className={styles.secondaryButton} disabled={isRewardLoading} onClick={onWatchAd}>{isRewardLoading ? "광고를 불러오는 중…" : "광고 보고 상세 분석 1회 받기"}</button>}
            <button type="button" className={styles.plusPrimaryButton} onClick={closeSheet}>무료 기능으로 계속하기</button>
            <button type="button" className={styles.membershipLaterButton} onClick={closeSheet}>나중에 보기</button>
            <small className={styles.membershipCancelAnytime}>실제 결제 및 Plus 구매 기능은 아직 제공되지 않습니다.</small>
          </div>
        </div>
      </section>
    </div>
  )
}
