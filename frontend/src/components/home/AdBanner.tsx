"use client"

import { Megaphone } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function AdBanner() {
  const { t } = useLanguage()

  return (
    <section className={styles.adBanner} aria-label="광고 영역">
      <span className={`${styles.iconBoxRound} ${styles.iconPeach}`}>
        <Megaphone className={styles.iconSm} />
      </span>
      <div>
        <strong>{t.home.adTitle}</strong>
        <p>{t.home.adDescription}</p>
      </div>
    </section>
  )
}
