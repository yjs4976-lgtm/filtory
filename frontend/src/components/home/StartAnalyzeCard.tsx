"use client"

import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function StartAnalyzeCard() {
  const router = useRouter()
  const { t } = useLanguage()

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>{t.home.startNewAnalysis}</h2>
      <button type="button" className={styles.primaryButton} onClick={() => router.push(ROUTES.ANALYZE)}>
        <Sparkles className={styles.iconSm} />
        {t.home.startAiAnalysis}
      </button>
    </section>
  )
}
