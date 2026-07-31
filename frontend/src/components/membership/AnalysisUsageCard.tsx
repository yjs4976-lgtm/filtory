"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, X } from "lucide-react"
import { useMembership } from "@/context/MembershipContext"
import { useToast } from "@/hooks/useToast"
import { MembershipBadge } from "./MembershipBadge"
import { MembershipSheet } from "./MembershipSheet"
import styles from "@/styles/App.module.css"
import { ROUTES } from "@/lib/routes"

export function AnalysisUsageCard() {
  const { membershipType, totalCount, availableCount, usedCount, remainingAnalyses, nextBillingDate, isUnlimited, addRewardAnalysis, canWatchRewardAd, formattedResetDate } = useMembership()
  const router = useRouter()
  const { showToast } = useToast()
  const [usageOpen, setUsageOpen] = useState(false)
  const [plusOpen, setPlusOpen] = useState(false)
  const [isRewardLoading, setIsRewardLoading] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLElement>(null)
  const isPlus = membershipType === "PLUS"
  const exhausted = !isUnlimited && !isPlus && remainingAnalyses === 0
  const progress = Math.min(100, availableCount ? usedCount / availableCount * 100 : 0)

  const closeUsage = () => {
    setUsageOpen(false)
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }

  useEffect(() => {
    if (!usageOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    sheetRef.current?.querySelector<HTMLElement>("button")?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeUsage()
      if (event.key !== "Tab" || !sheetRef.current) return
      const items = [...sheetRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]")]
      if (!items.length) return
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus() }
      if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus() }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown) }
  }, [usageOpen])

  const showPlus = () => { setUsageOpen(false); setPlusOpen(true) }
  const manageSubscription = () => router.push(ROUTES.MYPAGE_MEMBERSHIP)
  const watchRewardAd = () => {
    if (isRewardLoading) return
    // TODO: Replace this mock delay with the rewarded-ad SDK completion callback.
    setIsRewardLoading(true)
    window.setTimeout(() => {
      const added = addRewardAnalysis()
      setIsRewardLoading(false)
      showToast({ title: added ? "광고 시청이 완료되어 상세 분석 1회가 추가되었습니다." : "오늘 받을 수 있는 광고 보상을 이미 사용했어요.", tone: added ? "success" : "info" })
    }, 900)
  }

  return <section id="analysis-usage" className={styles.analysisUsageSection}>
    <h2 className={styles.titleSm}>내 분석</h2>
    <button ref={triggerRef} type="button" className={styles.analysisUsageCard} onClick={() => setUsageOpen(true)} aria-label="분석 이용 현황 열기">
      <span className={styles.analysisUsageCardTop}>
        <span className={styles.analysisUsageCardTitle}>{isUnlimited ? "운영자 분석 제한 없음" : isPlus ? "Filtory Plus" : exhausted ? "이번 달 무료 상세 분석 5회를 모두 사용했어요." : remainingAnalyses === 1 ? "이번 달 무료 상세 분석이 1회 남아 있어요" : "이번 달 무료 상세 분석"}</span>
        <span className={styles.analysisUsageCardRemaining}>{isUnlimited ? "관리자 무제한" : isPlus ? <MembershipBadge /> : !exhausted ? `${remainingAnalyses}회 남음` : null}</span>
      </span>
      {isPlus && <span className={styles.analysisUsagePlusLine}><span>이번 달 분석</span><strong>{usedCount} / {totalCount}회</strong></span>}
      {!isUnlimited && <span className={styles.membershipProgress} aria-label={`${usedCount} / ${availableCount}회 사용`}><span style={{ width: `${progress}%` }} /></span>}
      <span className={styles.analysisUsageMeta}>
        <span>{isUnlimited ? `이번 달 ${usedCount}회 분석` : `${usedCount} / ${availableCount}회 사용`}</span>
        <span>{isUnlimited ? "상세 분석 제한 없음" : isPlus ? `테스트 이용 기간 ${nextBillingDate?.replaceAll("-", ". ")}까지` : `다음 초기화 ${formattedResetDate}`}</span>
      </span>
      <span className={styles.analysisUsageManage}>이용 관리 <ChevronRight aria-hidden="true" /></span>
    </button>

    {usageOpen && <div className={styles.membershipBackdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeUsage()}>
      <section ref={sheetRef} className={`${styles.membershipSheet} ${styles.analysisUsageSheet}`} role="dialog" aria-modal="true" aria-labelledby="analysis-usage-title">
        <span className={styles.sheetHandle} aria-hidden="true" />
        <button type="button" className={styles.membershipClose} onClick={closeUsage} aria-label="분석 이용 현황 닫기"><X /></button>
        <h2 id="analysis-usage-title" className={styles.titleLg}>{exhausted ? "이번 달 무료 상세 분석 5회를 모두 사용했어요" : "분석 이용 현황"}</h2>
        {isUnlimited ? <div className={styles.analysisUsageSheetBody}>
          <p className={styles.membershipEyebrow}>관리자 무제한</p>
          <div className={styles.analysisUsageSheetValue}>운영자 분석 제한 없음</div>
          <div className={styles.analysisUsageSheetRow}><span>이번 달 분석 사용량</span><strong>{usedCount}회</strong></div>
          <p className={styles.bodyText}>운영자 계정은 월 상세 분석 한도의 적용을 받지 않아요.</p>
          <button type="button" className={styles.membershipLaterButton} onClick={closeUsage} aria-label="닫기">닫기</button>
        </div> : isPlus ? <div className={styles.analysisUsageSheetBody}>
          <p className={styles.membershipEyebrow}>현재 플랜</p><div className={styles.analysisUsageSheetValue}>Filtory Plus <MembershipBadge /></div>
          <div className={styles.analysisUsageSheetRow}><span>이번 달 분석 사용량</span><strong>{usedCount} / {availableCount}회</strong></div>
          <span className={styles.membershipProgress}><span style={{ width: `${progress}%` }} /></span>
          <div className={styles.analysisUsageSheetRow}><span>테스트 이용 가능 기간</span><strong>{nextBillingDate}</strong></div>
          <button type="button" className={styles.primaryButton} onClick={manageSubscription} aria-label="Plus 이용 관리">Plus 이용 관리</button>
        </div> : exhausted ? <div className={styles.analysisUsageSheetBody}>
          <p className={styles.bodyText}>기본 신뢰도 점수와 간단한 요약은 계속 확인할 수 있어요.<br /><strong>{formattedResetDate}부터</strong><br />무료 상세 분석 5회를 다시 이용할 수 있어요.</p>
          <span className={styles.membershipProgress}><span style={{ width: "100%" }} /></span>
          <button type="button" className={styles.primaryButton} onClick={showPlus} aria-label="Filtory Plus 알아보기">Filtory Plus 알아보기</button>
          <button type="button" className={styles.secondaryButton} disabled={isRewardLoading || !canWatchRewardAd} onClick={watchRewardAd} aria-label="광고를 보고 분석 1회 받기">{isRewardLoading ? "광고를 불러오는 중…" : canWatchRewardAd ? "광고 보고 분석 1회 받기" : "오늘의 광고 보상 사용 완료"}</button>
          <button type="button" className={styles.membershipLaterButton} onClick={closeUsage} aria-label="닫기">닫기</button>
        </div> : <div className={styles.analysisUsageSheetBody}>
          <p className={styles.membershipEyebrow}>이번 달 무료 상세 분석</p>
          <div className={styles.analysisUsageSheetRow}><strong>{usedCount} / {availableCount}회 사용</strong><strong className={styles.analysisUsageEmphasis}>{remainingAnalyses}회 남았어요.</strong></div>
          <span className={styles.membershipProgress}><span style={{ width: `${progress}%` }} /></span>
          <p className={styles.bodyText}>매월 1일에 무료 상세 분석 {totalCount}회가 다시 제공돼요.<br />다음 초기화: {formattedResetDate}</p>
          <button type="button" className={styles.primaryButton} onClick={showPlus} aria-label="Filtory Plus 알아보기">Filtory Plus 알아보기</button>
          <button type="button" className={styles.membershipLaterButton} onClick={() => showToast({ title: "분석 이용 안내는 준비 중입니다.", tone: "info" })} aria-label="분석 이용 안내">분석 이용 안내</button>
        </div>}
      </section>
    </div>}
    <MembershipSheet open={plusOpen} variant="benefits" onClose={() => { setPlusOpen(false); triggerRef.current?.focus() }} />
  </section>
}
