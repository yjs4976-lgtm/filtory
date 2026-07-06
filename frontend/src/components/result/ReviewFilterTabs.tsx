"use client"

import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function ReviewFilterTabs({ value = "all", onChange = null }) {
  const { t } = useLanguage()
  const tabs = [
    ["all", t.result.filterAll],
    ["trust", t.result.filterTrust],
    ["caution", t.result.filterCaution],
    ["ad", t.result.filterAd],
  ]

  return (
    <div className={styles.segmented}>
      {tabs.map(([key, label]) => (
        <button key={key} type="button" className={[styles.segmentButton, value === key ? styles.segmentButtonActive : ""].join(" ")} onClick={() => onChange?.(key)}>
          {label}
        </button>
      ))}
    </div>
  )
}
