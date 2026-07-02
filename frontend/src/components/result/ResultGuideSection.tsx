"use client"

import { FileText, Info, RotateCcw, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import type { AnalysisResultViewModel } from "@/lib/analysisResultMapper"
import { ROUTES } from "@/lib/routes"
import type { Language } from "@/lib/types"
import styles from "@/styles/App.module.css"

type ResultGuideSectionProps = {
  viewModel: AnalysisResultViewModel
  language: Language
}

export function ResultGuideSection({ viewModel, language }: ResultGuideSectionProps) {
  const router = useRouter()
  const label = {
    ko: {
      summary: "AI 요약",
      visitTip: "방문 전 참고",
      recommendation: "결과 활용 안내",
      warning: "주의/참고 신호",
      noWarning: "추가로 강조할 주의 신호가 많지 않아요.",
      reference: "이 결과는 병원 선택을 돕기 위한 참고 정보예요.",
      detail: "상세 내용 확인",
      retry: "다시 분석하기",
    },
    en: {
      summary: "AI summary",
      visitTip: "Before your visit",
      recommendation: "How to use this result",
      warning: "Reference signals",
      noWarning: "There are not many additional caution signals to highlight.",
      reference: "This result is reference information to help you choose a clinic.",
      detail: "View details",
      retry: "Analyze again",
    },
  }[language]
  const warnings = Array.from(new Set([...viewModel.signals.negativeSignals, ...viewModel.signals.warningSignals]))

  return (
    <>
      <section className={`${styles.accentCard} ${styles.stackSm}`}>
        <div className={styles.row}>
          <Sparkles className={`${styles.iconSm} ${styles.iconPrimary}`} />
          <h2 className={styles.titleSm}>{label.summary}</h2>
        </div>
        <p className={styles.summaryText}>{viewModel.content.summary}</p>
      </section>

      <section className={`${styles.card} ${styles.stackSm}`}>
        <div className={styles.row}>
          <Info className={`${styles.iconSm} ${styles.iconPrimary}`} />
          <h2 className={styles.titleSm}>{label.visitTip}</h2>
        </div>
        <p className={styles.summaryText}>{viewModel.content.visitTip}</p>
        <div className={styles.resultGuideNote}>
          <strong>{label.recommendation}</strong>
          <p>{viewModel.content.recommendation}</p>
        </div>
      </section>

      <section className={`${styles.card} ${styles.stackSm}`}>
        <div className={styles.row}>
          <FileText className={`${styles.iconSm} ${styles.mintText}`} />
          <h2 className={styles.titleSm}>{label.warning}</h2>
        </div>
        {warnings.length > 0 ? (
          <ul className={styles.list}>
            {warnings.map((item) => (
              <li key={item} className={`${styles.listItem} ${styles.bgPeach}`}>
                <span className={`${styles.listDot} ${styles.fillGold}`} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.resultEmptyText}>{label.noWarning}</p>
        )}
      </section>

      <div className={styles.note}>
        <Info className={styles.iconXs} />
        <span>{label.reference}</span>
      </div>

      <div className={styles.stackSm}>
        <button type="button" className={styles.primaryButton}>
          <FileText className={styles.iconSm} />
          {label.detail}
        </button>
        <button type="button" onClick={() => router.push(ROUTES.ANALYZE)} className={styles.secondaryButton}>
          <RotateCcw className={styles.iconSm} />
          {label.retry}
        </button>
      </div>
    </>
  )
}
