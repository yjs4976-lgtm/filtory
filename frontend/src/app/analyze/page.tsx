"use client"

import { CategoryFirstAnalyzeFlow } from "@/components/analyze/CategoryFirstAnalyzeFlow"
import { BottomNav } from "@/components/common/BottomNav"
import { Header } from "@/components/common/Header"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import styles from "@/styles/App.module.css"

export default function AnalyzePage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  return (
    <div className={styles.page}>
      <Header title={t.analyze.title} showBack />

      <main className={`${styles.main} ${styles.analyzeMain} ${styles.stackMd}`}>
        <CategoryFirstAnalyzeFlow userId={user?.id} />
        <section className={`${styles.card} ${styles.stackSm}`}>
          <p className={styles.memberEyebrow}>ANALYZE GUIDE</p>
          <h2 className={styles.titleMd}>{t.about.howTitle}</h2>
          <ol className={styles.compactList}>
            {t.about.steps.map((step: string) => <li key={step}>{step}</li>)}
          </ol>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
