"use client"

import { ChevronRight } from "lucide-react"
import { useMembership } from "@/context/MembershipContext"
import styles from "@/styles/App.module.css"

export function AnalysisUsageStatus({ onShowBenefits }: { onShowBenefits: () => void }) {
  const { membershipType, remainingAnalyses, totalCount, usedCount } = useMembership()
  return <div className={styles.analysisUsageStatus}>
    <span>{membershipType === "PLUS" ? <><strong>Filtory Plus</strong> 이용 중</> : <>이번 달 무료 상세 분석 <strong>{remainingAnalyses}회</strong> 남음</>}</span>
    {membershipType === "PLUS" ? <span>이번 달 분석 <strong>{usedCount} / {totalCount}회</strong></span> :
      <button type="button" onClick={onShowBenefits} aria-label="Filtory Plus 혜택 보기">Plus 혜택 보기 <ChevronRight aria-hidden="true" /></button>}
  </div>
}
