"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, RotateCcw } from "lucide-react"
import { ChatbotConnectCard } from "@/components/result/ChatbotConnectCard"
import { ResultActionCard } from "@/components/result/ResultActionCard"
import { ResultGuideSection } from "@/components/result/ResultGuideSection"
import { ResultInsightSection } from "@/components/result/ResultInsightSection"
import { ResultScoreSection } from "@/components/result/ResultScoreSection"
import { useLanguage } from "@/context/LanguageContext"
import { normalizeAnalysisResult } from "@/lib/analysisResultMapper"
import { readCurrentReviewAnalysis } from "@/lib/analysisStorage"
import { getHistoryMetaText } from "@/lib/historyDisplay"
import { ROUTES } from "@/lib/routes"
import type { CurrentReviewAnalysis } from "@/lib/types"
import styles from "@/styles/App.module.css"

export function ResultCard() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const [analysisResult, setAnalysisResult] = useState<CurrentReviewAnalysis | null>(null)
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

  return (
    <div className={styles.resultStack}>
      <ResultScoreSection
        viewModel={viewModel}
        categoryLabel={categoryLabel}
        analyzedAt={analysisResult?.analyzedAt}
      />
      <ResultInsightSection viewModel={viewModel} />
      <ResultGuideSection viewModel={viewModel} />
      <ResultActionCard />
      <ChatbotConnectCard analysisResultId={viewModel.ids.analysisResultId} analysisResult={analysisResult} />
    </div>
  )
}
