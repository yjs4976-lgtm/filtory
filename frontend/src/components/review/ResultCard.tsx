"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, ChevronRight, MessageCircle, RotateCcw } from "lucide-react"
import { ChatbotConnectCard } from "@/components/result/ChatbotConnectCard"
import { ResultActionCard } from "@/components/result/ResultActionCard"
import { ResultGuideSection } from "@/components/result/ResultGuideSection"
import { ResultInsightSection } from "@/components/result/ResultInsightSection"
import { ResultScoreSection } from "@/components/result/ResultScoreSection"
import { FavoriteHospitalButton } from "@/components/favorites/FavoriteHospitalButton"
import { useLanguage } from "@/context/LanguageContext"
import { normalizeAnalysisResult } from "@/lib/analysisResultMapper"
import { readCurrentReviewAnalysis } from "@/lib/analysisStorage"
import { getHistoryMetaText } from "@/lib/historyDisplay"
import { ROUTES } from "@/lib/routes"
import type { CurrentReviewAnalysis } from "@/lib/types"
import styles from "@/styles/App.module.css"
import { recentHospitalService } from "@/services/recentHospitalService"
import { useAuth } from "@/hooks/useAuth"
import type { HospitalItem } from "@/lib/types"
import { PartneredInsight } from "@/components/ads/PartneredInsight"
import { useMembership } from "@/context/MembershipContext"
import { getActiveSponsoredInsight } from "@/data/sponsoredInsights"
import { MembershipSheet } from "@/components/membership/MembershipSheet"
import { subscriptionPlans } from "@/data/subscriptionPlans"

export function ResultCard() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const { isAuthenticated } = useAuth()
  const { membershipType, checkDetailedAccessForAnalysis, formattedResetDate } = useMembership()
  const [plusOpen, setPlusOpen] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<CurrentReviewAnalysis | null>(null)
  const [authorizedAnalysisId, setAuthorizedAnalysisId] = useState<string | null>(null)
  const viewModel = useMemo(
    () => (analysisResult ? normalizeAnalysisResult(analysisResult, { language }) : null),
    [analysisResult, language]
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAnalysisResult(readCurrentReviewAnalysis())
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !analysisResult?.hospitalId) return
    void recentHospitalService.recordRecentHospital(analysisResult.hospitalId, analysisResult.analysisResultId).catch(() => undefined)
  }, [analysisResult?.analysisResultId, analysisResult?.hospitalId, isAuthenticated])

  useEffect(() => {
    const analysisId = analysisResult?.analysisResultId
    if (!analysisId) return
    let active = true
    void checkDetailedAccessForAnalysis(analysisId).then((allowed) => {
      if (active) setAuthorizedAnalysisId(allowed ? String(analysisId) : null)
    })
    return () => { active = false }
  }, [analysisResult?.analysisResultId, checkDetailedAccessForAnalysis])

  if (!viewModel) {
    return (
      <div className={styles.resultStack}>
        <section className={`${styles.card} ${styles.stackSm}`}>
          <div className={styles.row}>
            <AlertCircle className={`${styles.iconSm} ${styles.iconPrimary}`} />
            <h2 className={styles.titleSm}>{t.result.emptyDetailTitle}</h2>
          </div>
          <p className={styles.mutedText}>{t.result.emptyDetailDescription}</p>
          <button type="button" className={styles.primaryButton} onClick={() => router.push(ROUTES.ANALYZE)}>
            <RotateCcw className={styles.iconSm} />
            {t.result.retryCta}
          </button>
        </section>
      </div>
    )
  }

  const fallbackCategoryLabel = viewModel.subject.category ? t.categories[viewModel.subject.category] : t.result.title
  const categoryLabel = analysisResult
    ? getHistoryMetaText(analysisResult, language, fallbackCategoryLabel)
    : fallbackCategoryLabel
  const relatedAnalysisId = viewModel.ids.analysisRequestId
  const helpInquiryHref = `${ROUTES.HELP_NEW}?category=ANALYSIS_RESULT${relatedAnalysisId ? `&related_analysis_id=${relatedAnalysisId}` : ""}&title=${encodeURIComponent(t.help.resultHelpDefaultTitle)}`
  const favoriteHospital: HospitalItem | null = analysisResult?.hospitalName ? {
    id: String(analysisResult.hospitalId ?? analysisResult.externalPlaceId ?? ""),
    internalHospitalId: analysisResult.hospitalId,
    provider: analysisResult.hospitalId ? "filtory" : analysisResult.provider || analysisResult.sourceProvider,
    externalPlaceId: analysisResult.hospitalId ? undefined : analysisResult.externalPlaceId,
    name: analysisResult.hospitalName,
    category: analysisResult.category,
    region: "seoul",
    address: analysisResult.hospitalAddress || analysisResult.address || "",
    roadAddress: analysisResult.roadAddress,
    phone: analysisResult.phone,
    mapUrl: analysisResult.mapUrl,
  } : null

  return (
    <div className={styles.resultStack}>
      {favoriteHospital && <div className={styles.resultFavoriteAction}><strong>{favoriteHospital.name}</strong><FavoriteHospitalButton hospital={favoriteHospital} initialFavorite={analysisResult?.isFavorite} favoriteHospitalId={analysisResult?.favoriteHospitalId} /></div>}
      <ResultScoreSection
        viewModel={viewModel}
        categoryLabel={categoryLabel}
        analyzedAt={analysisResult?.analyzedAt}
      />
      <ResultInsightSection viewModel={viewModel} hasDetailedAccess={authorizedAnalysisId === String(viewModel.ids.analysisResultId ?? "")} formattedResetDate={formattedResetDate} onShowPlus={() => setPlusOpen(true)} />
      <Link href={helpInquiryHref} className={styles.analysisHelpCard}>
        <span className={styles.analysisHelpIcon}>
          <MessageCircle className={styles.iconMd} />
        </span>
        <span>
          <strong>{t.help.resultHelpTitle}</strong>
          <small>{t.help.resultHelpDescription}</small>
        </span>
        <ChevronRight className={styles.iconSm} />
      </Link>
      <ResultGuideSection viewModel={viewModel} />
      <ResultActionCard />
      <ChatbotConnectCard analysisResultId={viewModel.ids.analysisResultId} analysisResult={analysisResult} />
      <PartneredInsight insight={getActiveSponsoredInsight("analysis-result")} showSponsoredContent={subscriptionPlans[membershipType].showPartneredInsight} showResultEnd />
      <MembershipSheet open={plusOpen} variant="benefits" onClose={() => setPlusOpen(false)} />
    </div>
  )
}
