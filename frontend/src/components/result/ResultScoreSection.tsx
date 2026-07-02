import { ShieldCheck } from "lucide-react"
import type { AnalysisResultViewModel, TrustResultKey } from "@/lib/analysisResultMapper"
import { getGlobalAccessibilityLabel } from "@/lib/displayLabels"
import { getTrustLevelByKey } from "@/lib/score"
import type { Language } from "@/lib/types"
import styles from "@/styles/App.module.css"

type ResultScoreSectionProps = {
  viewModel: AnalysisResultViewModel
  categoryLabel: string
  language: Language
}

const trustSteps: TrustResultKey[] = ["very_safe", "safe", "normal", "caution", "danger"]

const stepLabels: Record<Language, Record<TrustResultKey, string>> = {
  ko: {
    very_safe: "매우 안전",
    safe: "안전",
    normal: "보통",
    caution: "주의",
    danger: "위험",
  },
  en: {
    very_safe: "Very safe",
    safe: "Safe",
    normal: "Normal",
    caution: "Caution",
    danger: "Danger",
  },
}

function ScoreTile({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className={styles.resultScoreTile}>
      <span className={styles.resultScoreLabel}>{label}</span>
      <strong className={styles.resultScoreValue}>{value}</strong>
      <span className={styles.resultScoreDescription}>{description}</span>
    </div>
  )
}

export function ResultScoreSection({ viewModel, categoryLabel, language }: ResultScoreSectionProps) {
  const label = {
    ko: {
      analyzed: "분석 리뷰",
      totalScore: "종합 점수",
      trustScore: "리뷰 신뢰도",
      adScore: "광고 의심도",
      infoScore: "정보 완성도",
      globalScore: "외국인 방문 편의도",
      countSuffix: "개",
      pointSuffix: "점",
      trustTitle: "신뢰도 단계",
    },
    en: {
      analyzed: "Analyzed reviews",
      totalScore: "Total score",
      trustScore: "Review trust",
      adScore: "Ad suspicion",
      infoScore: "Information quality",
      globalScore: getGlobalAccessibilityLabel(language, { short: true }),
      countSuffix: "",
      pointSuffix: "",
      trustTitle: "Trust stage",
    },
  }[language]

  return (
    <>
      <section className={`${styles.card} ${styles.resultHeroCard}`}>
        <p className={styles.mutedText}>{categoryLabel}</p>
        <h2 className={styles.resultHospitalName}>{viewModel.subject.hospitalName}</h2>
        <div className={styles.resultHeroMeta}>
          <span>{label.analyzed} {viewModel.scores.analyzedReviewCount}{label.countSuffix}</span>
          <span>{label.totalScore}</span>
        </div>
        <strong className={styles.resultTotalScore}>{viewModel.scores.totalScore}</strong>
      </section>

      <section className={styles.resultScoreGrid}>
        <ScoreTile label={label.totalScore} value={`${viewModel.scores.totalScore}${label.pointSuffix}`} description={viewModel.trust.description} />
        <ScoreTile label={label.trustScore} value={`${viewModel.scores.trustScore}${label.pointSuffix}`} description={viewModel.trust.label} />
        <ScoreTile label={label.adScore} value={`${viewModel.scores.adSuspicionScore}${label.pointSuffix}`} description={viewModel.ad.label} />
        <ScoreTile label={label.infoScore} value={`${viewModel.scores.informationScore}${label.pointSuffix}`} description={viewModel.information.label} />
        <ScoreTile
          label={label.globalScore}
          value={`${viewModel.scores.globalAccessibilityScore}${label.pointSuffix}`}
          description={viewModel.globalAccessibility.label}
        />
      </section>

      <section className={`${styles.card} ${styles.stackSm}`}>
        <div className={styles.row}>
          <ShieldCheck className={`${styles.iconSm} ${styles.iconPrimary}`} />
          <h2 className={styles.titleSm}>{label.trustTitle}</h2>
        </div>
        <div className={styles.trustStepList}>
          {trustSteps.map((step) => {
            const level = getTrustLevelByKey(step)
            return (
              <div
                key={step}
                className={`${styles.trustStepItem} ${viewModel.trust.key === step ? styles.trustStepActive : ""}`}
              >
                <span className={styles.trustShield} style={{ backgroundColor: level.softColor, color: level.color }}>
                  <ShieldCheck className={styles.iconSm} />
                </span>
                <span>{stepLabels[language][step]}</span>
              </div>
            )
          })}
        </div>
        <div className={styles.trustStageDescription}>
          <strong>{viewModel.trust.label}</strong>
          <p>{viewModel.trust.description}</p>
        </div>
      </section>
    </>
  )
}
