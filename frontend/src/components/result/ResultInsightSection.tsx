import { AlertTriangle, CheckCircle2, Globe2, Info, SearchCheck } from "lucide-react"
import type { AnalysisResultViewModel } from "@/lib/analysisResultMapper"
import { getGlobalAccessibilityLabel } from "@/lib/displayLabels"
import type { Language } from "@/lib/types"
import styles from "@/styles/App.module.css"

type ResultInsightSectionProps = {
  viewModel: AnalysisResultViewModel
  language: Language
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

export function ResultInsightSection({ viewModel, language }: ResultInsightSectionProps) {
  const referenceSignals = Array.from(new Set([...viewModel.repetition.referenceWarnings, ...viewModel.signals.warningSignals]))
  const label = {
    ko: {
      coreInsight: "핵심 인사이트",
      adSuspicion: "광고 의심도",
      repetitive: "반복 문구",
      suspicious: "광고성 의심 문구",
      reference: "참고/주의 신호",
      noRepetition: "반복적으로 의심되는 문구가 거의 발견되지 않았어요.",
      noSuspicious: "광고성으로 강하게 의심되는 문구가 아직 발견되지 않았어요.",
      noReference: "추가로 표시할 참고 신호가 많지 않아요.",
      informationQuality: "정보 품질",
      informationPrefix: "정보 완성도",
      checkItems: "확인된 정보 항목",
      noCheckItems: "리뷰에서 뚜렷한 체크 항목이 충분히 추출되지 않았어요.",
      globalAccessibility: "외국인 방문 편의도",
      confirmed: "확인됨",
      unconfirmed: "미확인",
    },
    en: {
      coreInsight: "Key insights",
      adSuspicion: "Ad suspicion",
      repetitive: "Repeated phrases",
      suspicious: "Ad-like phrases",
      reference: "Reference signals",
      noRepetition: "Few suspicious repeated phrases were detected.",
      noSuspicious: "No strongly ad-like phrases were detected yet.",
      noReference: "There are not many additional reference signals to show.",
      informationQuality: "Information quality",
      informationPrefix: "Information completeness",
      checkItems: "Detected information items",
      noCheckItems: "Not enough clear checklist items were extracted from the reviews.",
      globalAccessibility: getGlobalAccessibilityLabel(language),
      confirmed: "Confirmed",
      unconfirmed: "Unconfirmed",
    },
  }[language]

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
