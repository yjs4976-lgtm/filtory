"use client"

import Link from "next/link"
import { LogOut, User } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function ProfileCard() {
  const { user, logout, isLoading } = useAuth()
  const { t } = useLanguage()

  if (isLoading) {
    return (
      <section className={`${styles.card} ${styles.profileCard}`}>
        <span className={styles.profileAvatar}>
          <User className={styles.iconLg} />
        </span>
        <div className={styles.profileInfo}>
          <p className={styles.titleMd}>{t.mypage.profileLoadingTitle}</p>
          <p className={styles.profileEmail}>{t.mypage.profileLoadingDescription}</p>
        </div>
      </section>
    )
  }

  if (!user) {
    return (
      <section className={`${styles.card} ${styles.stackSm}`}>
        <div className={styles.profileCard}>
          <span className={styles.profileAvatar}>
            <User className={styles.iconLg} />
          </span>
          <div className={styles.profileInfo}>
            <p className={styles.titleMd}>{t.mypage.profileLoginRequiredTitle}</p>
            <p className={styles.profileEmail}>{t.mypage.profileLoginRequiredDescription}</p>
          </div>
        </div>

        <Link href={ROUTES.LOGIN} className={styles.primaryButton}>
          {t.mypage.loginAction}
        </Link>
      </section>
    )
  }

  const displayName = user.name || user.nickname || "Filtory"

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <div className={styles.profileCard}>
        <span className={styles.profileAvatar}>
          <User className={styles.iconLg} />
        </span>
        <div className={styles.profileInfo}>
          <p className={styles.titleMd}>{t.mypage.profileNameDisplay.replace("{name}", displayName)}</p>
          <p className={styles.profileEmail}>{user.email}</p>
          <p className={styles.mutedText}>
            {user.provider || "local"} / {user.status}
          </p>
        </div>
      </div>

      <div className={styles.stackSm}>
        <Link href={ROUTES.MYPAGE_PROFILE} className={styles.secondaryButton}>
          {t.mypage.editMemberInfo}
        </Link>

        <button type="button" className={styles.dangerButton} onClick={() => void logout()}>
          <LogOut className={styles.iconSm} />
          {t.mypage.logout}
        </button>
      </div>
    </section>
  )
}
