"use client"

import { useState } from "react"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/useToast"
import { memberService } from "@/services/memberService"
import { EmailVerificationCard } from "./EmailVerificationCard"
import { ProfileImageUploader } from "./ProfileImageUploader"
import styles from "@/styles/App.module.css"

export function ProfileEditForm() {
  const { user, updateUser } = useAuth()
  const { t } = useLanguage()
  const { showToast } = useToast()

  const [name, setName] = useState(user?.name ?? "")
  const [nickname, setNickname] = useState(user?.nickname ?? user?.name ?? "")
  const [nicknameCheck, setNicknameCheck] = useState<"idle" | "available" | "unavailable">("available")
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(user?.profileImageUrl ?? null)
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (!name.trim() || !nickname.trim()) {
      setError(t.mypage.requiredProfileFields)
      return
    }

    if (password || passwordConfirm) {
      if (password !== passwordConfirm) {
        setError(t.mypage.passwordMismatch)
        return
      }
    }

    if (nicknameCheck !== "available") {
      setError("닉네임 중복 확인을 완료해주세요.")
      return
    }

    try {
      if (!user) {
        setError(t.mypage.loginRequiredError)
        return
      }

      setIsSubmitting(true)
      const result = await memberService.updateProfile(user.id, {
        name: name.trim(),
        nickname: nickname.trim(),
        password: password || undefined,
        profileImageUrl,
      }, user)
      updateUser({
        ...result.data,
        email: result.data.email || user?.email || "",
        nickname: result.data.nickname || nickname.trim(),
        name: result.data.name || name.trim(),
        profileImageUrl: result.data.profileImageUrl ?? profileImageUrl,
      })
      setPassword("")
      setPasswordConfirm("")
      setSuccess(t.mypage.profileSaved)
      showToast({
        title: t.mypage.profileToast,
        tone: "success",
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : t.mypage.profileSaveFailed)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNicknameCheck = async () => {
    if (!nickname.trim()) {
      setError(t.mypage.requiredProfileFields)
      return
    }
    const result = await memberService.checkNicknameDuplicate(nickname)
    setNicknameCheck(result.available ? "available" : "unavailable")
    setError("")
  }

  return (
    <form className={`${styles.card} ${styles.stackSm}`} onSubmit={handleSubmit}>
      {error && <p className={styles.formError}>{error}</p>}
      {success && <p className={styles.formSuccess}>{success}</p>}

      <ProfileImageUploader value={profileImageUrl} onChange={setProfileImageUrl} />
      <EmailVerificationCard user={user} />

      <label className={styles.label} htmlFor="profile-name">
        {t.mypage.nameLabel}
        <input
          id="profile-name"
          className={styles.input}
          value={name}
          placeholder={t.mypage.namePlaceholder}
          autoComplete="name"
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <label className={styles.label} htmlFor="profile-email">
        {t.mypage.emailLabel}
        <input id="profile-email" className={styles.input} value={user?.email || ""} disabled readOnly />
      </label>

      <label className={styles.label} htmlFor="profile-nickname">
        {t.mypage.nicknameLabel}
        <div className={styles.inlineField}>
          <input
            id="profile-nickname"
            className={styles.input}
            value={nickname}
            placeholder={t.mypage.nicknamePlaceholder}
            autoComplete="nickname"
            onChange={(event) => {
              setNickname(event.target.value)
              setNicknameCheck(event.target.value === user?.nickname ? "available" : "idle")
            }}
          />
          <button type="button" className={styles.smallPillButton} onClick={handleNicknameCheck}>
            중복 확인
          </button>
        </div>
        {nicknameCheck === "available" && <span className={styles.formHintSuccess}>사용 가능한 닉네임이에요.</span>}
        {nicknameCheck === "unavailable" && <span className={styles.formHintError}>이미 사용 중인 닉네임이에요.</span>}
      </label>

      <div className={`${styles.softCard} ${styles.stackSm}`}>
        <p className={styles.titleSm}>{t.mypage.passwordSection}</p>
        <p className={styles.mutedText}>{t.mypage.passwordHelp}</p>
      </div>

      <label className={styles.label} htmlFor="profile-password">
        {t.mypage.newPassword}
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
        {t.mypage.newPasswordConfirm}
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
        {isSubmitting ? t.mypage.saving : t.mypage.saveProfile}
      </button>
    </form>
  )
}
