import type { UserInsight } from "@/lib/types"
import { categoryLabels } from "@/services/memberMockData"
import styles from "@/styles/App.module.css"

interface UserInsightCardProps {
  insight: UserInsight
}

export function UserInsightCard({ insight }: UserInsightCardProps) {
  return (
    <section className={`${styles.accentCard} ${styles.stackSm}`}>
      <p className={styles.memberEyebrow}>Filtory Insight</p>
      <h2 className={styles.titleMd}>최근 {categoryLabels[insight.mostAnalyzedCategory]}를 가장 많이 분석했어요.</h2>
      <p className={styles.bodyText}>{insight.summary}</p>
    </section>
  )
}
