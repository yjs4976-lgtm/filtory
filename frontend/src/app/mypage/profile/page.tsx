"use client"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { ProfileEditForm } from "@/components/mypage/ProfileEditForm"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export default function MyProfilePage() {
  const { t } = useLanguage()

  return (
    <ProtectedRoute>
      <AppShell title={t.mypage.profilePageTitle} showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>{t.mypage.profilePageTitle}</h1>
          <p className={styles.bodyText}>{t.mypage.profilePageDescription}</p>
        </section>

        <ProfileEditForm />
      </AppShell>
    </ProtectedRoute>
  )
}
