"use client"

import { ShieldCheck } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import type { User } from "@/lib/types"
import styles from "@/styles/App.module.css"

interface AccountSecurityCardProps {
  user: User | null
}

export function AccountSecurityCard({ user }: AccountSecurityCardProps) {
  const { t } = useLanguage()
  const loginMethod = user?.provider === "local" || !user?.provider ? t.mypage.emailLoginMethod : user.provider

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconMint}`}>
        <ShieldCheck className={styles.iconSm} />
      </span>
      <h2 className={styles.titleMd}>{t.mypage.accountSecurity}</h2>
      <div className={styles.metricGrid}>
        <span>{t.mypage.latestLogin} {user?.lastLoginAt ?? t.mypage.noRecentDate}</span>
        <span>{t.mypage.loginMethod} {loginMethod}</span>
        <span>{t.mypage.emailAuth} {user?.emailVerified ? t.mypage.completed : t.mypage.incomplete}</span>
        <span>{t.mypage.password} {user?.hasPassword === false ? t.mypage.unset : t.mypage.set}</span>
      </div>
    </section>
  )
}
