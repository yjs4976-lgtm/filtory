"use client"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export default function AppVersionPage() {
  const { t } = useLanguage()

  return (
    <ProtectedRoute>
      <AppShell title={t.mypage.version} showBack>
        <section className={`${styles.card} ${styles.stackSm}`}>
          <h1 className={styles.titleLg}>{t.mypage.version}</h1>
          <div className={styles.recordBody}>
            <strong className={styles.recordName}>Filtory</strong>
            <span className={styles.recordDate}>{t.mypage.currentVersion} v0.1.0</span>
          </div>
          <p className={styles.bodyText}>{t.mypage.versionDescription}</p>
          <p className={styles.formSuccess}>{t.mypage.latestVersion}</p>
          <p className={styles.mutedText}>{t.mypage.versionUpdateNotice}</p>
        </section>
      </AppShell>
    </ProtectedRoute>
  )
}
