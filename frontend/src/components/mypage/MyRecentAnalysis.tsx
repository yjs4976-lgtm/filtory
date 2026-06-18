import { HistoryList } from "@/components/history/HistoryList"
import styles from "@/styles/App.module.css"

export function MyRecentAnalysis() {
  return (
    <section className={styles.stackSm}>
      <h2 className={styles.titleSm}>최근 분석 기록</h2>
      <HistoryList />
    </section>
  )
}
