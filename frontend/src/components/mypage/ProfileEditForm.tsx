"use client"

import { useEffect, useMemo, useState } from "react"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/useToast"
import { memberService } from "@/services/memberService"
import { EmailVerificationCard } from "./EmailVerificationCard"
import { ProfileImageUploader } from "./ProfileImageUploader"
import styles from "@/styles/App.module.css"
import type { Gender } from "@/lib/types"
import { calculateInternationalAge, getAgeGroup, normalizeOptionalDate } from "@/lib/profileDemographics"
import { setWorkspaceDirty } from "@/lib/workspace"

export function ProfileEditForm() {
  const { user, updateUser } = useAuth()
  const { t, language } = useLanguage()
  const { showToast } = useToast()

  const [name, setName] = useState(user?.name ?? "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [nickname, setNickname] = useState(user?.nickname ?? user?.name ?? "")
  const [nicknameCheck, setNicknameCheck] = useState<"idle" | "available" | "unavailable">("available")
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(user?.profileImageUrl ?? null)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [removeProfileImage, setRemoveProfileImage] = useState(false)
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ?? "")
  const [gender, setGender] = useState<Gender | "">(user?.gender ?? "")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const calculatedAge = useMemo(() => dateOfBirth ? calculateInternationalAge(dateOfBirth) : null, [dateOfBirth])
  const calculatedAgeGroup = getAgeGroup(calculatedAge)

  const isDirty = Boolean(user) && (
    name !== (user?.name ?? "") || email !== (user?.email ?? "") ||
    nickname !== (user?.nickname ?? user?.name ?? "") ||
    dateOfBirth !== (user?.dateOfBirth ?? "") || gender !== (user?.gender ?? "") ||
    Boolean(profileImageFile) || removeProfileImage
  )
  useEffect(() => {
    setWorkspaceDirty(isDirty)
    return () => setWorkspaceDirty(false)
  }, [isDirty])

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

    if (nicknameCheck !== "available") {
      setError(t.auth.idDuplicateRequired)
      return
    }
    if (dateOfBirth && !normalizeOptionalDate(dateOfBirth)) { setError(t.auth.invalidDateOfBirth); return }

    try {
      if (!user) {
        setError(t.mypage.loginRequiredError)
        return
      }

      setIsSubmitting(true)
      const unchanged = name.trim() === (user.name ?? "") && email.trim() === (user.email ?? "") && nickname.trim() === (user.nickname ?? user.name ?? "") && dateOfBirth === (user.dateOfBirth ?? "") && gender === (user.gender ?? "") && !profileImageFile && !removeProfileImage
      if (unchanged) { setIsSubmitting(false); return }
      const result = await memberService.updateProfile(user.id, {
        name: name.trim(),
        email: email.trim() || undefined,
        nickname: nickname.trim(),
        profileImageUrl: profileImageFile || removeProfileImage ? undefined : profileImageUrl,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
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
        dateOfBirth: nextUser.dateOfBirth ?? (dateOfBirth || null),
        gender: nextUser.gender ?? (gender || null),
      })
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

      <section className={styles.optionalInfoSection}>
        <div><h2>{t.auth.optionalInfo}</h2><span>{t.auth.optional}</span></div>
        <p>{t.auth.optionalInfoDescription}</p>
        <div className={styles.optionalInfoGrid}>
          <label id="date-of-birth" className={styles.label} htmlFor="profile-date-of-birth"><span>{t.mypage.dateOfBirth} <em>{t.auth.optional}</em></span><input id="profile-date-of-birth" className={styles.input} type="date" max={new Date().toLocaleDateString("sv-SE")} value={dateOfBirth} onChange={(event)=>setDateOfBirth(event.target.value)} /></label>
          <label id="gender" className={styles.label} htmlFor="profile-gender"><span>{t.mypage.gender} <em>{t.auth.optional}</em></span><select id="profile-gender" className={styles.input} value={gender} onChange={(event)=>setGender(event.target.value as Gender | "")}><option value="">{t.auth.genderNotSelected}</option><option value="FEMALE">{t.auth.genderFemale}</option><option value="MALE">{t.auth.genderMale}</option><option value="OTHER">{t.auth.genderOther}</option><option value="PREFER_NOT_TO_SAY">{t.auth.genderPreferNotToSay}</option></select></label>
        </div>
        {calculatedAge !== null && calculatedAgeGroup && <div className={styles.profileCalculatedInfo}>
          <span>{language === "ko" ? "자동 계산 정보" : "Calculated information"}</span>
          <strong>{t.mypage.agePrefix.replace("{age}", String(calculatedAge))} · {t.mypage.ageGroups[calculatedAgeGroup]}</strong>
          <small>{language === "ko" ? "생년월일을 기준으로 만 나이와 연령대가 자동 계산됩니다." : "Age and age group are calculated from your date of birth."}</small>
        </div>}
      </section>

      <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
        {isSubmitting ? t.mypage.saving : t.mypage.saveProfile}
      </button>
    </form>
  )
}
