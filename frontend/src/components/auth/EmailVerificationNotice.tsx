"use client"

import { useState } from "react"
import { MailCheck } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { emailVerificationService } from "@/services/emailVerificationService"
import styles from "@/styles/App.module.css"

export function EmailVerificationNotice() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [message, setMessage] = useState("")

  const handleResend = async () => {
    await emailVerificationService.resendVerificationEmail(user?.email ?? "")
    setMessage(t.auth.verificationEmailSent)
  }

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <span className={`${styles.iconBoxSmall} ${styles.iconMint}`}>
        <MailCheck className={styles.iconSm} />
      </span>
      <h1 className={styles.titleLg}>
        {user?.emailVerified ? t.auth.emailVerifiedTitle : t.auth.emailVerificationNeededTitle}
      </h1>
      <p className={styles.bodyText}>
        {user?.emailVerified ? t.auth.emailVerifiedDescription : t.auth.emailVerificationNeededDescription}
      </p>
      {message && <p className={styles.formSuccess}>{message}</p>}
      {!user?.emailVerified && (
        <button type="button" className={styles.primaryButton} onClick={handleResend}>
          {t.auth.resendVerificationEmail}
        </button>
      )}
    </section>
  )
}
