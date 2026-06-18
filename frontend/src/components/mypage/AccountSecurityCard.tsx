"use client"

import { ShieldCheck } from "lucide-react"
import type { User } from "@/lib/types"
import styles from "@/styles/App.module.css"

interface AccountSecurityCardProps {
  user: User | null
}

export function AccountSecurityCard({ user }: AccountSecurityCardProps) {
  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconMint}`}>
        <ShieldCheck className={styles.iconSm} />
      </span>
      <h2 className={styles.titleMd}>계정 보안</h2>
      <div className={styles.metricGrid}>
        <span>최근 로그인 {user?.lastLoginAt ?? "2026.06.18"}</span>
        <span>로그인 방식 {user?.provider === "local" || !user?.provider ? "이메일" : user.provider}</span>
        <span>이메일 인증 {user?.emailVerified ? "완료" : "미완료"}</span>
        <span>비밀번호 {user?.hasPassword === false ? "미설정" : "설정됨"}</span>
      </div>
    </section>
  )
}
