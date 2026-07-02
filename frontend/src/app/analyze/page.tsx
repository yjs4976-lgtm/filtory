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
      </main>

      <BottomNav />
    </div>
  )
}
