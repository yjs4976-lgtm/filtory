"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { MailCheck } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { emailVerificationService } from "@/services/emailVerificationService"
import styles from "@/styles/App.module.css"

export function EmailVerificationNotice() {
  const { user, updateUser } = useAuth()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const [message, setMessage] = useState("")

  useEffect(() => {
    const token = searchParams.get("token")
    if (!token) return

    emailVerificationService.verifyEmail(token)
      .then((result) => {
        updateUser(result.data)
        setMessage(t.auth.emailVerifiedDescription)
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : t.auth.emailVerificationNeededDescription)
      })
  }, [searchParams, t.auth.emailVerifiedDescription, t.auth.emailVerificationNeededDescription, updateUser])

  const handleResend = async () => {
    if (!user?.email) {
      setMessage("프로필에서 이메일을 먼저 등록해주세요.")
      return
    }

    try {
      const result = await emailVerificationService.resendVerificationEmail()
      setMessage(result.data.mail?.sent === false ? "메일 발송 설정이 필요합니다." : t.auth.verificationEmailSent)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "인증 메일 발송에 실패했습니다.")
    }
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
