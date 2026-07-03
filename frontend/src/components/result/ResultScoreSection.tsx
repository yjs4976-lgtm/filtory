import { ShieldCheck } from "lucide-react"
import type { AnalysisResultViewModel, TrustResultKey } from "@/lib/analysisResultMapper"
import { useLanguage } from "@/context/LanguageContext"
import { getTrustLevelByKey } from "@/lib/score"
import styles from "@/styles/App.module.css"

type ResultScoreSectionProps = {
  viewModel: AnalysisResultViewModel
  categoryLabel: string
}

const trustSteps: TrustResultKey[] = ["very_safe", "safe", "normal", "caution", "danger"]

function ScoreTile({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className={styles.resultScoreTile}>
      <span className={styles.resultScoreLabel}>{label}</span>
      <strong className={styles.resultScoreValue}>{value}</strong>
      <span className={styles.resultScoreDescription}>{description}</span>
    </div>
  )
}

export function ResultScoreSection({ viewModel, categoryLabel }: ResultScoreSectionProps) {
  const { t } = useLanguage()
  const label = t.result.score

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
                <span>{t.trustLevels[step]}</span>
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
