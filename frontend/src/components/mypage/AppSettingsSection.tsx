"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, ChevronRight, Database, FileText, Languages, LogOut, Shield } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/useToast"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function AppSettingsSection() {
  const router = useRouter()
  const { language, setLanguage, t } = useLanguage()
  const { logout } = useAuth()
  const { showToast } = useToast()

  const settings = [
    { href: ROUTES.MYPAGE_SETTINGS, label: t.mypage.notificationTitle, description: t.mypage.notificationDesc, icon: Bell },
    { href: ROUTES.MYPAGE_TERMS, label: t.mypage.terms, description: "Filtory", icon: FileText },
    { href: ROUTES.MYPAGE_PRIVACY, label: t.mypage.privacy, description: "Filtory", icon: Shield },
    { href: ROUTES.MYPAGE_VERSION, label: t.mypage.version, description: "v0.1.0", icon: FileText },
    { href: ROUTES.MYPAGE_DATA, label: t.mypage.menu.data, description: t.mypage.menu.dataDesc, icon: Database },
  ]

  const handleLogout = async () => {
    await logout()
    showToast({
      title: t.mypage.logoutToastTitle,
      description: t.mypage.logoutToastDescription,
      tone: "info",
    })
    router.push(ROUTES.LOGIN)
  }

  return (
    <section className={styles.stackSm}>
      <h2 className={styles.titleSm}>{t.mypage.appSettings}</h2>
      <div className={`${styles.card} ${styles.stackSm}`}>
        <div className={styles.settingRow}>
          <span className={`${styles.iconBoxSmall} ${styles.iconMint}`}>
            <Languages className={styles.iconSm} />
          </span>
          <span className={styles.recordBody}>
            <span className={styles.recordName}>{t.mypage.languageTitle}</span>
            <span className={styles.recordDate}>{t.mypage.languageDesc}</span>
          </span>
        </div>
        <div className={styles.segmented}>
          <button
            type="button"
            className={`${styles.segmentButton} ${language === "ko" ? styles.segmentButtonActive : ""}`}
            onClick={() => setLanguage("ko")}
          >
            {t.common.langKo}
          </button>
          <button
            type="button"
            className={`${styles.segmentButton} ${language === "en" ? styles.segmentButtonActive : ""}`}
            onClick={() => setLanguage("en")}
          >
            {t.common.langEn}
          </button>
        </div>
      </div>
      <div className={styles.recordList}>
        {settings.map(({ href, label, description, icon: Icon }) => href ? (
          <Link key={label} href={`${href}?fromPage=5`} className={styles.recordButton}>
            <span className={`${styles.iconBoxSmall} ${styles.iconMint}`}>
              <Icon className={styles.iconSm} />
            </span>
            <span className={styles.recordBody}>
              <span className={styles.recordName}>{label}</span>
              <span className={styles.recordDate}>{description}</span>
            </span>
            <ChevronRight className={styles.iconSm} aria-hidden="true" />
          </Link>
        ) : (
          <article key={label} className={styles.recordButton}>
            <span className={`${styles.iconBoxSmall} ${styles.iconMint}`}><Icon className={styles.iconSm} /></span>
            <span className={styles.recordBody}><span className={styles.recordName}>{label}</span><span className={styles.recordDate}>{description}</span></span>
          </article>
        ))}
      </div>
      <button type="button" className={styles.secondaryButton} onClick={handleLogout}>
        <LogOut className={styles.iconSm} />
        {t.mypage.logout}
      </button>
    </section>
  )
}
