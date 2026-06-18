"use client"

import styles from "@/styles/App.module.css"

export function ReviewFilterTabs({ value = "all", onChange = null }) {
  return (
    <div className={styles.segmented}>
      {[
        ["all", "전체"],
        ["trust", "신뢰"],
        ["caution", "검토"],
        ["ad", "광고성"],
      ].map(([key, label]) => (
        <button key={key} type="button" className={[styles.segmentButton, value === key ? styles.segmentButtonActive : ""].join(" ")} onClick={() => onChange?.(key)}>
          {label}
        </button>
      ))}
    </div>
  )
}
