import { BarChart3, CalendarDays, Info, SearchCheck, ShieldCheck, Siren } from "lucide-react"
import type { AnalysisResultViewModel, TrustResultKey } from "@/lib/analysisResultMapper"
import { useLanguage } from "@/context/LanguageContext"
import { formatDisplayDate } from "@/lib/dateFormat"
import { getTrustLevelByKey } from "@/lib/score"
import styles from "@/styles/App.module.css"

type ResultScoreSectionProps = {
  viewModel: AnalysisResultViewModel
  categoryLabel: string
  analyzedAt?: string
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

function formatCheckCount(template: string, checked: number, total: number) {
  return template.replace("{checked}", String(checked)).replace("{total}", String(total))
}

function clampScore(score: number) {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score)))
}

function ScoreBreakdownItem({
  label,
  value,
  description,
  tone = "default",
}: {
  label: string
  value: number
  description: string
  tone?: "default" | "risk"
}) {
  const score = clampScore(value)
  return (
    <div className={styles.resultBreakdownItem}>
      <div className={styles.resultBreakdownHeader}>
        <span>{label}</span>
        <strong>{score}</strong>
      </div>
      <div className={styles.resultBreakdownTrack} aria-hidden="true">
        <span
          className={tone === "risk" ? styles.resultBreakdownRiskBar : styles.resultBreakdownBar}
          style={{ width: `${score}%` }}
        />
      </div>
      <p>{description}</p>
    </div>
  )
}

export function ResultScoreSection({ viewModel, categoryLabel, analyzedAt }: ResultScoreSectionProps) {
  const { t, language } = useLanguage()
  const label = t.result.score
  const analyzedDate = analyzedAt ? formatDisplayDate(analyzedAt, language) : formatDisplayDate(new Date().toISOString(), language)
  const breakdown = viewModel.scoreBreakdown
  const reviewCount = viewModel.scores.analyzedReviewCount
  const capNotice = reviewCount > 0 && reviewCount < 5
    ? label.lowReviewCountNotice
    : reviewCount >= 5 && reviewCount < 10
      ? label.limitedReviewCountNotice
      : ""
  const isLowConfidence = viewModel.analysisConfidence.key === "low"

  return (
    <>
      <section className={`${styles.card} ${styles.resultHeroCard}`}>
        <p className={styles.mutedText}>{categoryLabel}</p>
        <h2 className={styles.resultHospitalName}>{viewModel.subject.hospitalName}</h2>
        <div className={styles.resultHeroMeta}>
          <span>{label.analyzed} {viewModel.scores.analyzedReviewCount}{label.countSuffix}</span>
          <span><CalendarDays className={styles.iconXs} /> {label.analysisDate} {analyzedDate}</span>
        </div>
        <p className={styles.resultHeroConclusion}>{viewModel.trust.label}</p>
        <p className={styles.resultHeroDescription}>{viewModel.trust.description}</p>
        <div className={styles.resultTrustScoreBlock}>
          <span>{label.reviewTrustIndex}</span>
          <strong className={styles.resultTotalScore}>{viewModel.scores.reviewTrustScore}</strong>
          <small>{label.pointSuffix}</small>
        </div>
        <div className={`${styles.resultConfidenceBox} ${isLowConfidence ? styles.resultConfidenceCaution : ""}`}>
          <strong>{label.analysisConfidence}: {viewModel.analysisConfidence.label}</strong>
          <p>{viewModel.analysisConfidence.description}</p>
        </div>
        {capNotice && (
          <div className={styles.resultScoreCapNotice}>
            <Info className={styles.iconXs} />
            <span>{capNotice}</span>
          </div>
        )}
      </section>

      <section className={styles.resultScoreGrid} aria-label={label.coreSummary}>
        <ScoreTile
          label={label.trustScore}
          value={`${viewModel.scores.reviewTrustScore}${label.pointSuffix}`}
          description={viewModel.trust.label}
        />
        <ScoreTile
          label={label.adSignal}
          value={viewModel.ad.label}
          description={viewModel.ad.description}
        />
        <ScoreTile
          label={label.infoCheckCount}
          value={formatCheckCount(label.checkCount, viewModel.information.checkedCount, viewModel.information.totalCount)}
          description={viewModel.information.description}
        />
      </section>

      <section className={`${styles.card} ${styles.resultBreakdownCard}`} aria-label={label.scoreDetailsTitle}>
        <div className={styles.row}>
          <BarChart3 className={`${styles.iconSm} ${styles.iconPrimary}`} />
          <h2 className={styles.titleSm}>{label.scoreDetailsTitle}</h2>
        </div>
        <p className={styles.resultBreakdownIntro}>{label.scoreDetailsDescription}</p>
        <div className={styles.resultBreakdownGrid}>
          <ScoreBreakdownItem
            label={label.evidenceScore}
            value={breakdown.evidenceScore}
            description={label.evidenceScoreDescription}
          />
          <ScoreBreakdownItem
            label={label.specificityScore}
            value={breakdown.specificityScore}
            description={label.specificityScoreDescription}
          />
          <ScoreBreakdownItem
            label={label.diversityScore}
            value={breakdown.diversityScore}
            description={label.diversityScoreDescription}
          />
          <ScoreBreakdownItem
            label={label.riskScore}
            value={breakdown.riskScore}
            description={label.riskScoreDescription}
            tone="risk"
          />
        </div>
      </section>

      <section className={`${styles.resultVisitNote} ${styles.stackSm}`}>
        <div className={styles.row}>
          <Info className={`${styles.iconSm} ${styles.iconPrimary}`} />
          <h2 className={styles.titleSm}>{label.preVisitTitle}</h2>
        </div>
        <p>{label.preVisitDescription}</p>
      </section>

      <section className={`${styles.card} ${styles.stackSm}`}>
        <div className={styles.row}>
          <SearchCheck className={`${styles.iconSm} ${styles.mintText}`} />
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

      <div className={styles.resultDisclaimer}>
        <Siren className={styles.iconXs} />
        <span>{label.disclaimer}</span>
      </div>
    </>
  )
}
