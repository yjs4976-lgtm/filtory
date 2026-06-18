"use client"

import type { HospitalCategory } from "@/lib/types"
import { categoryLabels } from "@/services/memberMockData"
import styles from "@/styles/App.module.css"

interface CompareCategoryTabsProps {
  value: HospitalCategory
  onChange: (category: HospitalCategory) => void
}

const categories: HospitalCategory[] = ["derma", "eye", "dental"]

export function CompareCategoryTabs({ value, onChange }: CompareCategoryTabsProps) {
  return (
    <section className={styles.segmented}>
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          className={`${styles.segmentButton} ${value === category ? styles.segmentButtonActive : ""}`}
          onClick={() => onChange(category)}
        >
          {categoryLabels[category]}
        </button>
      ))}
    </section>
  )
}
