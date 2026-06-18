"use client"

import type { CompareHospital } from "@/lib/types"
import { formatStars } from "@/services/memberMockData"
import styles from "@/styles/App.module.css"

interface CompareHospitalSelectorProps {
  hospitals: CompareHospital[]
  selectedIds: number[]
  onToggle: (id: number) => void
}

export function CompareHospitalSelector({ hospitals, selectedIds, onToggle }: CompareHospitalSelectorProps) {
  return (
    <section className={styles.stackSm}>
      <h2 className={styles.titleSm}>비교할 병원을 선택해주세요</h2>
      <p className={styles.mutedText}>최소 2개, 최대 3개까지 선택할 수 있어요.</p>
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
                  신뢰도 {hospital.trustScore}점 · 글로벌 {formatStars(hospital.globalAccessRating)}
                </span>
              </span>
              <span className={styles.neutralPill}>{selected ? "선택됨" : "선택"}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
