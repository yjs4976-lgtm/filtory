"use client"

import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function HospitalInfoForm({ hospital, naver, google, onChange }) {
  const { t } = useLanguage()

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <input className={styles.input} value={hospital} onChange={(event) => onChange("hospital", event.target.value)} placeholder={t.analyze.legacyHospitalNamePlaceholder} />
      <input className={styles.input} value={naver} onChange={(event) => onChange("naver", event.target.value)} placeholder={t.analyze.legacyNaverPlaceholder} />
      <input className={styles.input} value={google} onChange={(event) => onChange("google", event.target.value)} placeholder={t.analyze.legacyGooglePlaceholder} />
    </section>
  )
}
