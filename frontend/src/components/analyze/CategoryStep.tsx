"use client"

import { CategorySelector } from "@/components/review/CategorySelector"
import { useLanguage } from "@/context/LanguageContext"
import type { HospitalCategory } from "@/lib/types"
import styles from "@/styles/App.module.css"

export function CategoryStep({
  category,
  onChange,
}: {
  category: HospitalCategory
  onChange: (category: HospitalCategory) => void
}) {
  const { t } = useLanguage()

  return (
    <div className={styles.stackSm}>
      <p className={styles.bodyText}>{t.analyze.categoryInstruction}</p>
      <CategorySelector selected={category} onSelect={onChange} />
    </div>
  )
}
