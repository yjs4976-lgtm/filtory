"use client"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export default function TermsPage() {
  const { t } = useLanguage()
  return <ProtectedRoute><AppShell title={t.mypage.terms} showBack><section className={`${styles.card} ${styles.stackSm}`}><h1 className={styles.titleLg}>{t.mypage.terms}</h1><h2 className={styles.titleSm}>{t.mypage.termsPurpose}</h2><p className={styles.bodyText}>{t.mypage.termsContent}</p><p className={styles.mutedText}>{t.mypage.legalNotice}</p></section></AppShell></ProtectedRoute>
}
