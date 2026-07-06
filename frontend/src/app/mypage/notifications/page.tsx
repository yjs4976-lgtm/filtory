"use client"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { NotificationList } from "@/components/mypage/NotificationList"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export default function NotificationsPage() {
  const { t } = useLanguage()

  return (
    <ProtectedRoute>
      <AppShell title={t.mypage.notificationsPageTitle} showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>{t.mypage.notificationsPageTitle}</h1>
          <p className={styles.bodyText}>{t.mypage.notificationsPageDescription}</p>
        </section>
        <NotificationList />
      </AppShell>
    </ProtectedRoute>
  )
}
