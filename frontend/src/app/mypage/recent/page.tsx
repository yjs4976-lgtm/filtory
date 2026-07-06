"use client"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { RecentViewedHospitalList } from "@/components/mypage/RecentViewedHospitalList"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export default function RecentHospitalsPage() {
  const { t } = useLanguage()

  return (
    <ProtectedRoute>
      <AppShell title={t.mypage.recentPageTitle} showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>{t.mypage.recentPageTitle}</h1>
          <p className={styles.bodyText}>{t.mypage.recentPageDescription}</p>
        </section>
        <RecentViewedHospitalList />
      </AppShell>
    </ProtectedRoute>
  )
}
