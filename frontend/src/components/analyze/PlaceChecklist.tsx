"use client"

import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function PlaceChecklist() {
  const { t } = useLanguage()

  return (
    <section className={`${styles.softCard} ${styles.stackSm}`}>
      <span className={styles.label}>{t.analyze.placeChecklistTitle}</span>
      <label><input type="checkbox" /> {t.analyze.placeChecklistHours}</label>
      <label><input type="checkbox" /> {t.analyze.placeChecklistPhotos}</label>
      <label><input type="checkbox" /> {t.analyze.placeChecklistReservation}</label>
    </section>
  )
}
