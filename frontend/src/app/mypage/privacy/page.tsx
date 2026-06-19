"use client"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export default function PrivacyPage() {
  const { t } = useLanguage()
  return <ProtectedRoute><AppShell title={t.mypage.privacy} showBack><section className={`${styles.card} ${styles.stackSm}`}><h1 className={styles.titleLg}>{t.mypage.privacy}</h1><h2 className={styles.titleSm}>{t.mypage.privacyPurpose}</h2><p className={styles.bodyText}>{t.mypage.privacyContent}</p><p className={styles.mutedText}>{t.mypage.legalNotice}</p></section></AppShell></ProtectedRoute>
}
