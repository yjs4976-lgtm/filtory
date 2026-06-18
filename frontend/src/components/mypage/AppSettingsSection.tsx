"use client"

import { useRouter } from "next/navigation"
import { Bell, FileText, Languages, LogOut, Moon, Shield } from "lucide-react"
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
    { label: t.mypage.notificationTitle, description: t.mypage.notificationDesc, icon: Bell },
    { label: t.mypage.displayTitle, description: t.mypage.displayDesc, icon: Moon },
    { label: t.mypage.terms, description: "Filtory", icon: FileText },
    { label: t.mypage.privacy, description: "Filtory", icon: Shield },
    { label: t.mypage.version, description: "v0.1.0", icon: FileText },
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
        {settings.map(({ label, description, icon: Icon }) => (
          <article key={label} className={styles.recordButton}>
            <span className={`${styles.iconBoxSmall} ${styles.iconMint}`}>
              <Icon className={styles.iconSm} />
            </span>
            <span className={styles.recordBody}>
              <span className={styles.recordName}>{label}</span>
              <span className={styles.recordDate}>{description}</span>
            </span>
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
