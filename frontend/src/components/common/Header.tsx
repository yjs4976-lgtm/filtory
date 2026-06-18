"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bell, ShieldCheck, UserRound } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/lib/routes"
import { LanguageToggle } from "./LanguageToggle"
import styles from "@/styles/App.module.css"

export function Header({ title = "", showBack = false, showBrand = false, showBell = false }) {
  const router = useRouter()
  const { t } = useLanguage()
  const { user, isLoading } = useAuth()

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.headerLeft}>
          {showBack && (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={t.common.back}
              className={styles.iconButton}
            >
              <ArrowLeft className={styles.iconMd} />
            </button>
          )}
          {showBrand ? (
            <Link href="/" className={styles.brandLink}>
              <span className={styles.brandMark}>
                <ShieldCheck className={styles.iconMd} />
              </span>
              <span className={styles.brandText}>{t.appName}</span>
            </Link>
          ) : (
            <h1 className={styles.headerTitle}>{title}</h1>
          )}
        </div>

        <div className={styles.headerActions}>
          <LanguageToggle />
          {!isLoading && (
            user ? (
              <Link href={ROUTES.MYPAGE} className={styles.profileChip} aria-label={t.common.mypage}>
                <UserRound className={styles.iconSm} />
                <span>{user.nickname || user.name || t.nav.my}</span>
              </Link>
            ) : (
              <Link href={ROUTES.LOGIN} className={styles.headerLoginButton}>
                {t.common.login}
              </Link>
            )
          )}
          {showBell && (
            <button type="button" aria-label="Notifications" className={styles.iconButton}>
              <Bell className={styles.iconMd} />
              <span className={styles.notificationDot} />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
