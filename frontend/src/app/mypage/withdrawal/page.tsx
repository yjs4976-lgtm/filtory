"use client"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { WithdrawalForm } from "@/components/mypage/WithdrawalForm"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export default function WithdrawalPage() {
  const { t } = useLanguage()

  return (
    <ProtectedRoute>
      <AppShell title={t.mypage.withdrawalPageTitle} showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>{t.mypage.withdrawalPageTitle}</h1>
          <p className={styles.bodyText}>{t.mypage.withdrawalPageDescription}</p>
        </section>

        <WithdrawalForm />
      </AppShell>
    </ProtectedRoute>
  )
}
