"use client"

import { useRouter } from "next/navigation"
import { FileText, LogIn } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function ResultActionCard() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { t } = useLanguage()

  if (!isAuthenticated) {
    return (
      <section className={`${styles.softCard} ${styles.stackSm}`}>
        <h2 className={styles.titleSm}>{t.result.completedTitle}</h2>
        <p className={styles.mutedText}>{t.result.loginSaveDescription}</p>
        <div className={styles.actionRow}>
          <button type="button" className={styles.primaryButton} onClick={() => router.push(ROUTES.LOGIN)}>
            <LogIn className={styles.iconSm} />
            {t.result.loginAndSave}
          </button>
          <button type="button" className={styles.secondaryButton}>
            {t.result.viewOnly}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className={`${styles.softCard} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>{t.result.savedTitle}</h2>
      <button type="button" className={styles.primaryButton} onClick={() => router.push(ROUTES.HISTORY)}>
        <FileText className={styles.iconSm} />
        {t.result.viewHistory}
      </button>
    </section>
  )
}
