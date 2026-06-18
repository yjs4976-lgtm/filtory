"use client"

import { Lightbulb } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function TrustTipCard() {
  const { t } = useLanguage()

  return (
    <section className={`${styles.tipCard} ${styles.row}`}>
      <span className={`${styles.iconBoxRound} ${styles.iconMint}`}>
        <Lightbulb className={styles.iconSm} />
      </span>
      <p>{t.home.trustTip}</p>
    </section>
  )
}
