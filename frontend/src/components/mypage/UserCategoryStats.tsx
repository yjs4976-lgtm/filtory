import type { UserInsight } from "@/lib/types"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

interface UserCategoryStatsProps {
  insight: UserInsight
}

export function UserCategoryStats({ insight }: UserCategoryStatsProps) {
  const { t, language } = useLanguage()
  const stats = [
    [t.mypage.insightTopCategory, t.categories[insight.mostAnalyzedCategory]],
    [t.mypage.insightFrequentArea, language === "ko" ? insight.frequentArea : t.mypage.insightFrequentAreaFallback],
    [t.mypage.insightAverageTrust, language === "ko" ? insight.savedHospitalAverageTrustLevel : t.trustLevels.high],
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
