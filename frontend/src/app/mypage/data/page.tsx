"use client"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { DataManageSection } from "@/components/mypage/DataManageSection"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export default function MyDataPage() {
  const { t } = useLanguage()

  return (
    <ProtectedRoute>
      <AppShell title={t.mypage.dataPageTitle} showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>{t.mypage.dataPageTitle}</h1>
          <p className={styles.bodyText}>{t.mypage.dataPageDescription}</p>
        </section>
        <DataManageSection />
      </AppShell>
    </ProtectedRoute>
  )
}
