"use client"

import { useState } from "react"
import { securityService } from "@/services/securityService"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function PasswordChangeForm() {
  const { t } = useLanguage()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

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

    await securityService.changePassword(currentPassword, newPassword)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setMessage(t.mypage.passwordChanged)
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
      <button type="submit" className={styles.primaryButton}>
        {t.mypage.passwordSection}
      </button>
    </form>
  )
}
