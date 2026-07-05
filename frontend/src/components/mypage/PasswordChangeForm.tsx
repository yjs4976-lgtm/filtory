"use client"

import { useState } from "react"
import { KeyRound, ShieldCheck, X } from "lucide-react"
import { securityService } from "@/services/securityService"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import styles from "@/styles/App.module.css"

type SocialPasswordNoticeModalProps = {
  title: string
  description: string
  hint: string
  actionLabel: string
  closeLabel: string
  onClose: () => void
}

function SocialPasswordNoticeModal({
  title,
  description,
  hint,
  actionLabel,
  closeLabel,
  onClose,
}: SocialPasswordNoticeModalProps) {
  return (
    <div className={styles.modalBackdrop} role="presentation" onClick={onClose}>
      <section
        className={`${styles.modalCard} ${styles.socialPasswordModal}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="social-password-notice-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.socialPasswordModalClose}
          aria-label={closeLabel}
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </button>
        <div className={styles.socialPasswordModalIcon} aria-hidden="true">
          <ShieldCheck size={24} />
        </div>
        <div className={styles.stackSm}>
          <h2 id="social-password-notice-title" className={styles.titleMd}>
            {title}
          </h2>
          <p className={styles.bodyText}>{description}</p>
          <p className={styles.socialPasswordNoticeHint}>{hint}</p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={onClose}>
          {actionLabel}
        </button>
      </section>
    </div>
  )
}

export function PasswordChangeForm() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSocialPasswordNoticeDismissed, setIsSocialPasswordNoticeDismissed] = useState(false)
  const isSocialOnlyAccount = user?.hasPassword === false
  const showSocialPasswordNotice = isSocialOnlyAccount && !isSocialPasswordNoticeDismissed

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage("")
    setError("")

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t.mypage.passwordChangeRequired)
      return
    }
    if (newPassword.length < 8) {
      setError(t.mypage.passwordMinLength)
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t.mypage.passwordMismatch)
      return
    }

    if (!user) {
      setError(t.mypage.loginRequiredError)
      return
    }

    if (isSocialOnlyAccount) {
      setIsSocialPasswordNoticeDismissed(false)
      return
    }

    try {
      setIsSubmitting(true)
      await securityService.changePassword(user.id, currentPassword, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setMessage(t.mypage.passwordChanged)
    } catch (error) {
      setError(error instanceof Error ? error.message : t.mypage.profileSaveFailed)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSocialOnlyAccount) {
    return (
      <section className={`${styles.card} ${styles.stackSm} ${styles.socialPasswordNoticeCard}`}>
        <div className={styles.socialPasswordNoticeHeader}>
          <span className={styles.socialPasswordNoticeIcon} aria-hidden="true">
            <ShieldCheck size={22} />
          </span>
          <div className={styles.stackSm}>
            <h2 className={styles.titleSm}>{t.mypage.socialPasswordChangeBlockedTitle}</h2>
            <p className={styles.bodyText}>{t.mypage.socialPasswordChangeBlockedDescription}</p>
            <p className={styles.socialPasswordNoticeHint}>{t.mypage.socialPasswordChangeBlockedHint}</p>
          </div>
        </div>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => setIsSocialPasswordNoticeDismissed(false)}
        >
          <KeyRound size={16} aria-hidden="true" />
          {t.mypage.socialPasswordChangeBlockedAction}
        </button>
        {showSocialPasswordNotice && (
          <SocialPasswordNoticeModal
            title={t.mypage.socialPasswordChangeBlockedTitle}
            description={t.mypage.socialPasswordChangeBlockedDescription}
            hint={t.mypage.socialPasswordChangeBlockedHint}
            actionLabel={t.mypage.socialPasswordChangeBlockedAction}
            closeLabel={t.common.close}
            onClose={() => setIsSocialPasswordNoticeDismissed(true)}
          />
        )}
      </section>
    )
  }

  return (
    <form className={`${styles.card} ${styles.stackSm}`} onSubmit={handleSubmit}>
      <h2 className={styles.titleSm}>{t.mypage.passwordSection}</h2>
      {message && <p className={styles.formSuccess}>{message}</p>}
      {error && <p className={styles.formError}>{error}</p>}
      <label className={styles.label}>
        {t.mypage.currentPassword}
        <input className={styles.input} type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
      </label>
      <label className={styles.label}>
        {t.mypage.newPassword}
        <input className={styles.input} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
      </label>
      <label className={styles.label}>
        {t.mypage.newPasswordConfirm}
        <input className={styles.input} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
      </label>
      <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
        {isSubmitting ? t.mypage.saving : t.mypage.passwordSection}
      </button>
    </form>
  )
}
