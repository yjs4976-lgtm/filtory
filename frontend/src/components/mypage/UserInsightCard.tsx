import type { UserInsight } from "@/lib/types"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

interface UserInsightCardProps {
  insight: UserInsight
}

export function UserInsightCard({ insight }: UserInsightCardProps) {
  const { t, language } = useLanguage()
  const categoryLabel = t.categories[insight.mostAnalyzedCategory]
  const summary = language === "ko" ? insight.summary : t.mypage.insightSummaryFallback

  return (
    <section className={`${styles.accentCard} ${styles.stackSm}`}>
      <p className={styles.memberEyebrow}>Filtory Insight</p>
      <h2 className={styles.titleMd}>{t.mypage.insightMostAnalyzed.replace("{category}", categoryLabel)}</h2>
      <p className={styles.bodyText}>{summary}</p>
    </section>
  )
}
