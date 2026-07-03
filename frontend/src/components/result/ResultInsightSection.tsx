import { AlertTriangle, CheckCircle2, Globe2, Info, SearchCheck } from "lucide-react"
import type { AnalysisResultViewModel } from "@/lib/analysisResultMapper"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

type ResultInsightSectionProps = {
  viewModel: AnalysisResultViewModel
}

function InsightList({ items, emptyText, tone }: { items: string[]; emptyText: string; tone: string }) {
  if (items.length === 0) {
    return <p className={styles.resultEmptyText}>{emptyText}</p>
  }

  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item} className={`${styles.listItem} ${tone}`}>
          <span className={`${styles.listDot} ${styles.fillPrimary}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function ResultInsightSection({ viewModel }: ResultInsightSectionProps) {
  const { t } = useLanguage()
  const referenceSignals = Array.from(new Set([...viewModel.repetition.referenceWarnings, ...viewModel.signals.warningSignals]))
  const label = t.result.insights

  return (
    <>
      <section className={`${styles.card} ${styles.stackMd}`}>
        <div className={styles.row}>
          <AlertTriangle className={`${styles.iconSm} ${styles.pinkText}`} />
          <h2 className={styles.titleSm}>{label.coreInsight}</h2>
        </div>
        <div className={styles.resultBadgePanel}>
          <span className={`${styles.resultStatusBadge} ${viewModel.ad.key === "high" ? styles.resultBadgeHigh : styles.resultBadgeSoft}`}>
            {label.adSuspicion} {viewModel.ad.label}
          </span>
          <p className={styles.mutedText}>{viewModel.ad.description}</p>
        </div>
        <div className={styles.stackSm}>
          <h3 className={styles.titleXs}>{label.repetitive}</h3>
          <InsightList items={viewModel.repetition.repetitivePhrases} emptyText={label.noRepetition} tone={styles.bgPeach} />
        </div>
        <div className={styles.stackSm}>
          <h3 className={styles.titleXs}>{label.suspicious}</h3>
          <InsightList items={viewModel.repetition.suspiciousPhrases} emptyText={label.noSuspicious} tone={styles.bgPink} />
        </div>
        <div className={styles.stackSm}>
          <h3 className={styles.titleXs}>{label.reference}</h3>
          <InsightList items={referenceSignals} emptyText={label.noReference} tone={styles.bgMint} />
        </div>
      </section>

      <section className={`${styles.card} ${styles.stackSm}`}>
        <div className={styles.row}>
          <SearchCheck className={`${styles.iconSm} ${styles.mintText}`} />
          <h2 className={styles.titleSm}>{label.informationQuality}</h2>
        </div>
        <p className={styles.summaryText}>
          {label.informationPrefix} {viewModel.information.label} · {viewModel.information.score}
        </p>
        <p className={styles.mutedText}>{viewModel.information.description}</p>
        <div className={styles.stackSm}>
          <h3 className={styles.titleXs}>{label.checkItems}</h3>
          <InsightList items={viewModel.information.checkItems} emptyText={label.noCheckItems} tone={styles.bgMint} />
        </div>
      </section>

      <section className={`${styles.card} ${styles.stackSm}`}>
        <div className={styles.row}>
          <Globe2 className={`${styles.iconSm} ${styles.iconPrimary}`} />
          <h2 className={styles.titleSm}>{label.globalAccessibility}</h2>
        </div>
        <p className={styles.summaryText}>
          {viewModel.globalAccessibility.label} · {viewModel.globalAccessibility.score}/{viewModel.globalAccessibility.maxScore}
        </p>
        <div className={styles.resultCheckGrid}>
          {viewModel.globalAccessibility.checks.map((check) => (
            <div key={check.key} className={styles.resultCheckItem}>
              {check.checked ? (
                <CheckCircle2 className={`${styles.iconXs} ${styles.mintText}`} />
              ) : (
                <Info className={`${styles.iconXs} ${styles.iconPrimary}`} />
              )}
              <span>{check.label}</span>
              <strong>{check.checked ? label.confirmed : label.unconfirmed}</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
