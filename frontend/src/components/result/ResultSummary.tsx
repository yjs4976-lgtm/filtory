import { mockAnalysisResult } from "@/lib/mockData"
import styles from "@/styles/App.module.css"

export function ResultSummary() {
  return (
    <section className={`${styles.accentCard} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>종합 결과 요약</h2>
      <p className={styles.bodyText}>{mockAnalysisResult.summary.ko}</p>
    </section>
  )
}
