import { recentAnalyses } from "@/lib/mockData"
import { HistoryCard } from "./HistoryCard"
import styles from "@/styles/App.module.css"

export function HistoryList({ items = recentAnalyses }) {
  return (
    <section className={styles.recordList}>
      {items.map((item) => (
        <HistoryCard key={item.id} item={item} />
      ))}
    </section>
  )
}
