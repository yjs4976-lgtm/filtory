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
  const [email, setEmail] = useState(user?.email ?? "")
  const [nickname, setNickname] = useState(user?.nickname ?? user?.name ?? "")
  const [nicknameCheck, setNicknameCheck] = useState<"idle" | "available" | "unavailable">("available")
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(user?.profileImageUrl ?? null)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [removeProfileImage, setRemoveProfileImage] = useState(false)
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

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t.auth.invalidEmail)
      return
    }

    if (password || passwordConfirm) {
      if (password !== passwordConfirm) {
        setError(t.mypage.passwordMismatch)
        return
      }
    }

    if (nicknameCheck !== "available") {
      setError(t.auth.idDuplicateRequired)
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
        email: email.trim() || undefined,
        nickname: nickname.trim(),
        password: password || undefined,
        profileImageUrl: profileImageFile || removeProfileImage ? undefined : profileImageUrl,
      }, user)
      const imageResult = profileImageFile
        ? await memberService.uploadProfileImage(user.id, profileImageFile)
        : removeProfileImage && user.profileImageUrl
          ? await memberService.removeProfileImage(user.id)
          : result
      const nextUser = imageResult.data
      updateUser({
        ...nextUser,
        email: nextUser.email || "",
        nickname: nextUser.nickname || nickname.trim(),
        name: nextUser.name || name.trim(),
        profileImageUrl: nextUser.profileImageUrl ?? null,
      })
      setPassword("")
      setPasswordConfirm("")
      setProfileImageFile(null)
      setRemoveProfileImage(false)
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

      <ProfileImageUploader
        value={profileImageUrl}
        onChange={(nextUrl, file) => {
          setProfileImageUrl(nextUrl)
          setProfileImageFile(file ?? null)
          setRemoveProfileImage(nextUrl === null && Boolean(user?.profileImageUrl))
        }}
      />
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
        <input
          id="profile-email"
          className={styles.input}
          type="email"
          value={email}
          placeholder="example@email.com"
          autoComplete="email"
          disabled={Boolean(user?.email)}
          readOnly={Boolean(user?.email)}
          onChange={(event) => setEmail(event.target.value)}
        />
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
            {t.auth.duplicateCheck}
          </button>
        </div>
        {nicknameCheck === "available" && <span className={styles.formHintSuccess}>{t.auth.idAvailable}</span>}
        {nicknameCheck === "unavailable" && <span className={styles.formHintError}>{t.auth.idUnavailable}</span>}
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
