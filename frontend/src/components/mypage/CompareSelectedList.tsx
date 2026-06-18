"use client"

import type { CompareHospital } from "@/lib/types"
import styles from "@/styles/App.module.css"

interface CompareSelectedListProps {
  hospitals: CompareHospital[]
}

export function CompareSelectedList({ hospitals }: CompareSelectedListProps) {
  if (hospitals.length === 0) return null

  return (
    <section className={`${styles.softCard} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>선택한 병원</h2>
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
