import type { UserInsight } from "@/lib/types"
import { categoryLabels } from "@/services/memberMockData"
import styles from "@/styles/App.module.css"

interface UserCategoryStatsProps {
  insight: UserInsight
}

export function UserCategoryStats({ insight }: UserCategoryStatsProps) {
  const stats = [
    ["가장 많이 분석한 분야", categoryLabels[insight.mostAnalyzedCategory]],
    ["자주 확인한 지역", insight.frequentArea],
    ["저장 병원 평균 신뢰도", insight.savedHospitalAverageTrustLevel],
  ]

  return (
    <section className={styles.summaryGrid}>
      {stats.map(([label, value]) => (
        <article key={label} className={styles.summaryCard}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  )
}
