"use client"

import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function HospitalInfoStep({
  hospital,
  region,
  naver,
  google,
  onHospitalChange,
  onRegionChange,
  onNaverChange,
  onGoogleChange,
}: {
  hospital: string
  region: string
  naver: string
  google: string
  onHospitalChange: (value: string) => void
  onRegionChange: (value: string) => void
  onNaverChange: (value: string) => void
  onGoogleChange: (value: string) => void
}) {
  const { t } = useLanguage()

  return (
    <div className={styles.stackSm}>
      <label className={styles.label} htmlFor="hospital">{t.analyze.hospitalLabel}</label>
      <input id="hospital" className={styles.input} value={hospital} onChange={(event) => onHospitalChange(event.target.value)} placeholder={t.analyze.hospitalPlaceholder} />
      <label className={styles.label} htmlFor="region">{t.analyze.regionLabel}</label>
      <input id="region" className={styles.input} value={region} onChange={(event) => onRegionChange(event.target.value)} placeholder={t.analyze.regionPlaceholder} />
      <label className={styles.label} htmlFor="naver">{t.analyze.naverLabel}</label>
      <input id="naver" className={styles.input} value={naver} onChange={(event) => onNaverChange(event.target.value)} placeholder={t.analyze.naverPlaceholder} />
      <label className={styles.label} htmlFor="google">{t.analyze.googleLabel}</label>
      <input id="google" className={styles.input} value={google} onChange={(event) => onGoogleChange(event.target.value)} placeholder={t.analyze.googlePlaceholder} />
    </div>
  )
}
