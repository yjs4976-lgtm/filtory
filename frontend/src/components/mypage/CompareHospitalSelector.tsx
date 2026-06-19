"use client"

import type { CompareHospital } from "@/lib/types"
import { formatStars } from "@/services/memberMockData"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

interface CompareHospitalSelectorProps {
  hospitals: CompareHospital[]
  selectedIds: number[]
  onToggle: (id: number) => void
}

export function CompareHospitalSelector({ hospitals, selectedIds, onToggle }: CompareHospitalSelectorProps) {
  const { t, language } = useLanguage()
  return (
    <section className={styles.stackSm}>
      <h2 className={styles.titleSm}>{t.mypage.compareSelectTitle}</h2>
      <p className={styles.mutedText}>{t.mypage.compareSelectDescription}</p>
      <div className={styles.recordList}>
        {hospitals.map((hospital) => {
          const selected = selectedIds.includes(hospital.id)
          const disabled = !selected && selectedIds.length >= 3

          return (
            <button
              key={hospital.id}
              type="button"
              className={`${styles.recordButton} ${selected ? styles.selectedRecordButton : ""}`}
              disabled={disabled}
              onClick={() => onToggle(hospital.id)}
            >
              <span className={styles.recordBody}>
                <strong className={styles.recordName}>{hospital.hospitalName}</strong>
                <span className={styles.recordDate}>
                  {t.mypage.trustScoreLabel} {hospital.trustScore}{language === "ko" ? "점" : " pts"} · {t.mypage.globalAccessLabel} {formatStars(hospital.globalAccessRating)}
                </span>
              </span>
              <span className={styles.neutralPill}>{selected ? t.mypage.selected : t.mypage.select}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
