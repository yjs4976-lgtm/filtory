"use client"

import { useState } from "react"
import { MailCheck } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { emailVerificationService } from "@/services/emailVerificationService"
import styles from "@/styles/App.module.css"

export function EmailVerificationNotice() {
  const { user } = useAuth()
  const [message, setMessage] = useState("")

  const handleResend = async () => {
    await emailVerificationService.resendVerificationEmail(user?.email ?? "")
    setMessage("인증 메일을 다시 보냈어요.")
  }

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconMint}`}>
        <MailCheck className={styles.iconSm} />
      </span>
      <h1 className={styles.titleLg}>{user?.emailVerified ? "이메일 인증이 완료되었어요." : "이메일 인증이 필요해요."}</h1>
      <p className={styles.bodyText}>
        {user?.emailVerified ? "Filtory 계정 이메일이 안전하게 확인됐어요." : "가입한 이메일로 인증 메일을 보냈어요."}
      </p>
      {message && <p className={styles.formSuccess}>{message}</p>}
      {!user?.emailVerified && (
        <button type="button" className={styles.primaryButton} onClick={handleResend}>
          인증 메일 다시 보내기
        </button>
      )}
    </section>
  )
}
