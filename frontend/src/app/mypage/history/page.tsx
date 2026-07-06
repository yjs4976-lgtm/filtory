"use client"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { AnalysisHistoryList } from "@/components/mypage/AnalysisHistoryList"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export default function MyHistoryPage() {
  const { t } = useLanguage()

  return (
    <ProtectedRoute>
      <AppShell title={t.mypage.historyPageTitle} showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>{t.mypage.historyPageTitle}</h1>
          <p className={styles.bodyText}>{t.mypage.historyPageDescription}</p>
        </section>
        <AnalysisHistoryList />
      </AppShell>
    </ProtectedRoute>
  )
}
