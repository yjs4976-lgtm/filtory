"use client"

import Link from "next/link"
import { MailCheck } from "lucide-react"
import type { User } from "@/lib/types"
import { ROUTES } from "@/lib/routes"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

interface EmailVerificationCardProps {
  user: User | null
}

export function EmailVerificationCard({ user }: EmailVerificationCardProps) {
  const { t } = useLanguage()
  return (
    <section className={`${styles.softCard} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconMint}`}>
        <MailCheck className={styles.iconSm} />
      </span>
      <h2 className={styles.titleSm}>{user?.emailVerified ? t.auth.emailVerifiedTitle : t.auth.emailVerificationNeededTitle}</h2>
      {!user?.emailVerified && (
        <Link href={ROUTES.VERIFY_EMAIL} className={styles.secondaryButton}>
          {t.mypage.verifyEmail}
        </Link>
      )}
    </section>
  )
}
