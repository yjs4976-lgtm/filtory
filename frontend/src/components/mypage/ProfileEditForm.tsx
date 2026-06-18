"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/useToast"
import { memberService } from "@/services/memberService"
import styles from "@/styles/App.module.css"

export function ProfileEditForm() {
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()

  const [nickname, setNickname] = useState(user?.nickname ?? user?.name ?? "")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요.")
      return
    }

    if (password || passwordConfirm) {
      if (password !== passwordConfirm) {
        setError("새 비밀번호가 서로 다릅니다.")
        return
      }
    }

    try {
      if (!user) {
        setError("로그인이 필요합니다.")
        return
      }

      setIsSubmitting(true)
      const result = await memberService.updateProfile(user.id, {
        nickname: nickname.trim(),
        password: password || undefined,
      }, user)
      updateUser({
        ...result.data,
        email: result.data.email || user?.email || "",
        nickname: result.data.nickname || nickname.trim(),
        name: result.data.name || nickname.trim(),
      })
      setPassword("")
      setPasswordConfirm("")
      setSuccess("회원 정보가 수정되었습니다.")
      showToast({
        title: "회원정보가 저장되었어요.",
        tone: "success",
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : "회원 정보 수정 실패")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className={`${styles.card} ${styles.stackSm}`} onSubmit={handleSubmit}>
      {error && <p className={styles.formError}>{error}</p>}
      {success && <p className={styles.formSuccess}>{success}</p>}

      <label className={styles.label} htmlFor="profile-email">
        이메일
        <input id="profile-email" className={styles.input} value={user?.email || ""} disabled readOnly />
      </label>

      <label className={styles.label} htmlFor="profile-nickname">
        닉네임
        <input
          id="profile-nickname"
          className={styles.input}
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
        />
      </label>

      <div className={`${styles.softCard} ${styles.stackSm}`}>
        <p className={styles.titleSm}>비밀번호 변경</p>
        <p className={styles.mutedText}>변경하지 않으려면 비워두세요.</p>
      </div>

      <label className={styles.label} htmlFor="profile-password">
        새 비밀번호
        <input
          id="profile-password"
          className={styles.input}
          type="password"
          value={password}
          autoComplete="new-password"
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      <label className={styles.label} htmlFor="profile-password-confirm">
        새 비밀번호 확인
        <input
          id="profile-password-confirm"
          className={styles.input}
          type="password"
          value={passwordConfirm}
          autoComplete="new-password"
          onChange={(event) => setPasswordConfirm(event.target.value)}
        />
      </label>

      <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
        {isSubmitting ? "수정 중..." : "수정 완료"}
      </button>
    </form>
  )
}
