"use client"

import Link from "next/link"
import { MailCheck } from "lucide-react"
import type { User } from "@/lib/types"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

interface EmailVerificationCardProps {
  user: User | null
}

export function EmailVerificationCard({ user }: EmailVerificationCardProps) {
  return (
    <section className={`${styles.softCard} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconMint}`}>
        <MailCheck className={styles.iconSm} />
      </span>
      <h2 className={styles.titleSm}>{user?.emailVerified ? "이메일 인증 완료" : "이메일 인증이 아직 완료되지 않았어요."}</h2>
      {!user?.emailVerified && (
        <Link href={ROUTES.VERIFY_EMAIL} className={styles.secondaryButton}>
          이메일 인증하기
        </Link>
      )}
    </section>
  )
}
