"use client"

import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function HeroSection() {
  const { t } = useLanguage()

  return (
    <section className={styles.accentCard}>
      <h1 className={styles.titleLg}>Filtory</h1>
      <p className={styles.bodyText}>{t.home.heroDescription}</p>
    </section>
  )
}
