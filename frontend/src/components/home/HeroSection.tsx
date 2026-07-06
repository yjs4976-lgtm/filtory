"use client"

import { LogoMark } from "@/components/common/LogoMark"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function HeroSection() {
  const { t } = useLanguage()

  return (
    <section className={styles.accentCard}>
      <div className={styles.heroBrandTitle}>
        <LogoMark size={42} className={styles.heroBrandLogo} />
        <h1 className={styles.titleLg}>Filtory</h1>
      </div>
      <p className={styles.bodyText}>{t.home.heroDescription}</p>
    </section>
  )
}
