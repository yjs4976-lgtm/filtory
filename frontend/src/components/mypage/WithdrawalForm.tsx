"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/useToast"
import { ROUTES } from "@/lib/routes"
import { memberService } from "@/services/memberService"
import { WithdrawalConfirmModal } from "./WithdrawalConfirmModal"
import { WithdrawalReasonSelect } from "./WithdrawalReasonSelect"
import styles from "@/styles/App.module.css"

const OTHER_REASON = "other"

export function WithdrawalForm() {
  const router = useRouter()
  const { t } = useLanguage()
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const [password, setPassword] = useState("")
  const [reason, setReason] = useState("")
  const [confirmText, setConfirmText] = useState("")
  const [otherReason, setOtherReason] = useState("")
  const [checked, setChecked] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const withdrawalReason = reason === OTHER_REASON ? otherReason.trim() : reason
  const canWithdraw = password.length > 0 && withdrawalReason.length > 0 && confirmText === t.mypage.withdrawalConfirmText && checked && !isSubmitting

  const handleWithdrawal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!canWithdraw) {
      setError(t.mypage.withdrawalError)
      return
    }

    setModalOpen(true)
  }

  const performWithdrawal = async () => {
    try {
      if (!user) {
        setError(t.mypage.loginRequiredError)
        return
      }

      setIsSubmitting(true)
      await memberService.withdrawUser(user.id, password, withdrawalReason)
      showToast({
        title: t.mypage.withdrawalToast,
        tone: "success",
      })
      await logout()
      router.push(ROUTES.LOGIN)
    } catch (error) {
      setError(error instanceof Error ? error.message : t.mypage.withdrawalFailed)
    } finally {
      setIsSubmitting(false)
      setModalOpen(false)
    }
  }

  return (
    <form className={`${styles.card} ${styles.stackSm}`} onSubmit={handleWithdrawal}>
      <div className={`${styles.softCard} ${styles.stackSm}`}>
        <strong>{t.mypage.withdrawalNoticeTitle}</strong>
        <p className={styles.mutedText}>{t.mypage.withdrawalNoticeDescription}</p>
      </div>

      <div className={`${styles.softCard} ${styles.stackSm}`}>
        <strong>{t.mypage.withdrawalDeletedInfoTitle}</strong>
        <ul className={styles.compactList}>
          <li>{t.mypage.withdrawalDeletedProfile}</li>
          <li>{t.mypage.withdrawalDeletedSavedHospitals}</li>
          <li>{t.mypage.withdrawalDeletedHistory}</li>
          <li>{t.mypage.withdrawalDeletedNotifications}</li>
        </ul>
        <p className={styles.mutedText}>{t.mypage.withdrawalRetentionNotice}</p>
      </div>

      <WithdrawalReasonSelect value={reason} onChange={setReason} />

      {reason === OTHER_REASON && (
        <label className={styles.label} htmlFor="withdraw-other-reason">
          {t.mypage.withdrawalOtherReason}
          <textarea
            id="withdraw-other-reason"
            className={styles.textarea}
            placeholder={t.mypage.withdrawalOtherReasonPlaceholder}
            value={otherReason}
            onChange={(event) => setOtherReason(event.target.value)}
          />
        </label>
      )}

      {error && <p className={styles.formError}>{error}</p>}

      <label className={styles.label} htmlFor="withdraw-password">
        {t.mypage.passwordConfirmLabel}
        <input
          id="withdraw-password"
          className={styles.input}
          type="password"
          placeholder={t.mypage.passwordConfirmPlaceholder}
          value={password}
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      <label className={styles.row}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
        />
        {t.mypage.withdrawalAgreement}
      </label>

      <label className={styles.label}>
        {t.mypage.withdrawalConfirmInputGuide.replace("{text}", t.mypage.withdrawalConfirmText)}
        <input
          className={styles.input}
          value={confirmText}
          placeholder={t.mypage.withdrawalConfirmText}
          onChange={(event) => setConfirmText(event.target.value)}
        />
      </label>

      <button className={styles.dangerButton} type="submit" disabled={!canWithdraw}>
        {t.mypage.withdrawalSubmit}
      </button>
      <WithdrawalConfirmModal
        open={modalOpen}
        isSubmitting={isSubmitting}
        onClose={() => setModalOpen(false)}
        onConfirm={performWithdrawal}
      />
    </form>
  )
}
