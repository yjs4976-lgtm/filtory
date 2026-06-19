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

const OTHER_REASON = "기타"

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
  const canWithdraw = password.length > 0 && withdrawalReason.length > 0 && confirmText === "탈퇴합니다" && checked && !isSubmitting

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
        <strong>회원 탈퇴 시 아래 정보가 삭제돼요.</strong>
        <ul className={styles.compactList}>
          <li>프로필 정보</li>
          <li>저장한 병원 목록</li>
          <li>분석 기록</li>
          <li>알림 설정</li>
        </ul>
        <p className={styles.mutedText}>서비스 운영을 위해 신고 내역 일부는 일정 기간 보관될 수 있어요.</p>
      </div>

      <WithdrawalReasonSelect value={reason} onChange={setReason} />

      {reason === OTHER_REASON && (
        <label className={styles.label} htmlFor="withdraw-other-reason">
          기타 사유
          <textarea
            id="withdraw-other-reason"
            className={styles.textarea}
            placeholder="탈퇴 사유를 입력해주세요."
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
        계속하려면 아래에 ‘탈퇴합니다’를 입력해주세요.
        <input
          className={styles.input}
          value={confirmText}
          placeholder="탈퇴합니다"
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
