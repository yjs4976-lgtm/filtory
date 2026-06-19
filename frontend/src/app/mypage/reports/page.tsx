"use client"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { MyReportList } from "@/components/mypage/MyReportList"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export default function MyReportsPage() {
  const { t } = useLanguage()

  return (
    <ProtectedRoute>
      <AppShell title={t.mypage.reportsPageTitle} showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>{t.mypage.reportsPageTitle}</h1>
          <p className={styles.bodyText}>{t.mypage.reportsPageDescription}</p>
        </section>
        <MyReportList />
      </AppShell>
    </ProtectedRoute>
  )
}
