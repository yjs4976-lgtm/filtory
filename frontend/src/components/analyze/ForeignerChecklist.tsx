"use client"

import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function ForeignerChecklist() {
  const { t } = useLanguage()

  return (
    <section className={`${styles.softCard} ${styles.stackSm}`}>
      <span className={styles.label}>{t.analyze.foreignerChecklistTitle}</span>
      <label><input type="checkbox" /> {t.analyze.foreignerChecklistEnglish}</label>
      <label><input type="checkbox" /> {t.analyze.foreignerChecklistMap}</label>
      <label><input type="checkbox" /> {t.analyze.foreignerChecklistTransit}</label>
    </section>
  )
}
