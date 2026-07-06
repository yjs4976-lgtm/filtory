"use client"

import type { CompareHospital } from "@/lib/types"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

interface CompareSelectedListProps {
  hospitals: CompareHospital[]
}

export function CompareSelectedList({ hospitals }: CompareSelectedListProps) {
  const { t } = useLanguage()
  if (hospitals.length === 0) return null

  return (
    <section className={`${styles.softCard} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>{t.mypage.selectedHospitals}</h2>
      <div className={styles.socialProviderGrid}>
        {hospitals.map((hospital) => (
          <span key={hospital.id} className={styles.connectedPill}>
            {hospital.hospitalName}
          </span>
        ))}
      </div>
    </section>
  )
}
