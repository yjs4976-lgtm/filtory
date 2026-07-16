"use client"

import Link from "next/link"
import { UserRound, UserRoundPen } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"
import { useMembership } from "@/context/MembershipContext"
import { calculateInternationalAge, getAgeGroup } from "@/lib/profileDemographics"

function maskEmail(email?: string) {
  if (!email) return ""
  const [name, domain] = email.split("@")
  if (!domain) return email
  const visible = name.slice(0, 2)
  return `${visible}${"*".repeat(Math.max(4, name.length - visible.length))}@${domain}`
}

function formatDate(value?: string, locale = "ko-KR") {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10).replaceAll("-", ".")
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" }).format(date)
}

export function MyPageUserCard() {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const { membershipType } = useMembership()

  if (!user) return null

  const displayName = user.nickname || user.name || "Filtory"
  const joinedAt = user.createdAt ? formatDate(user.createdAt, language === "ko" ? "ko-KR" : "en-US") : t.mypage.fallbackMemberSince
  const maskedEmail = maskEmail(user.email) || t.mypage.maskedEmailFallback
  const age = user.dateOfBirth ? calculateInternationalAge(user.dateOfBirth) : null
  const ageGroup = getAgeGroup(age)
  const genderLabel = user.gender === "FEMALE" ? t.auth.genderFemale : user.gender === "MALE" ? t.auth.genderMale : user.gender === "OTHER" ? t.auth.genderOther : user.gender === "PREFER_NOT_TO_SAY" ? t.auth.genderPreferNotToSay : null
  const profileMeta = [ageGroup ? t.mypage.ageGroups[ageGroup] : null, genderLabel].filter((item): item is string => Boolean(item))

  return (
    <section className={styles.memberHeroCard} aria-labelledby="mypage-profile-name">
      <div className={styles.memberProfileHeader}>
        <span className={styles.memberAvatar} aria-hidden="true">
          {user.profileImageUrl ? <span className={styles.avatarImage} style={{ backgroundImage: `url(${user.profileImageUrl})` }} /> : <UserRound />}
        </span>

        <div className={styles.memberIdentity}>
          <p className={styles.memberEyebrow}>{t.mypage.profileEyebrow}</p>
          <h1 id="mypage-profile-name" className={styles.memberName}>{displayName}</h1>
          <p className={styles.memberMaskedEmail} title={maskedEmail}>{maskedEmail}</p>
        </div>

        <Link href={ROUTES.MYPAGE_PROFILE} className={styles.profileEditAction} aria-label={language === "ko" ? "프로필 편집" : "Edit profile"}>
          <span>{t.mypage.profileEdit}</span><UserRoundPen aria-hidden="true" />
        </Link>
      </div>

      <div className={styles.memberProfileMeta}>
        <div>
          {profileMeta.length > 0 && <p>{profileMeta.join(" · ")}</p>}
          <small>{t.mypage.memberSince} {joinedAt}</small>
        </div>
        <span className={membershipType === "PLUS" ? styles.memberPlanPlus : styles.memberPlanFree}>{membershipType === "PLUS" ? "FILTORY PLUS" : "FREE"}</span>
      </div>
    </section>
  )
}
