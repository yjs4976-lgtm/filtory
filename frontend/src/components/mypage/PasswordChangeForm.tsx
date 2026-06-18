"use client"

import { useState } from "react"
import { securityService } from "@/services/securityService"
import styles from "@/styles/App.module.css"

export function PasswordChangeForm() {
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
      setError("비밀번호를 모두 입력해주세요.")
      return
    }
    if (newPassword.length < 8) {
      setError("새 비밀번호는 8자 이상이어야 해요.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("새 비밀번호가 서로 다릅니다.")
      return
    }

    await securityService.changePassword(currentPassword, newPassword)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setMessage("비밀번호가 변경되었어요.")
  }

  return (
    <form className={`${styles.card} ${styles.stackSm}`} onSubmit={handleSubmit}>
      <h2 className={styles.titleSm}>비밀번호 변경</h2>
      {message && <p className={styles.formSuccess}>{message}</p>}
      {error && <p className={styles.formError}>{error}</p>}
      <label className={styles.label}>
        현재 비밀번호
        <input className={styles.input} type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
      </label>
      <label className={styles.label}>
        새 비밀번호
        <input className={styles.input} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
      </label>
      <label className={styles.label}>
        새 비밀번호 확인
        <input className={styles.input} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
      </label>
      <button type="submit" className={styles.primaryButton}>
        비밀번호 변경
      </button>
    </form>
  )
}
