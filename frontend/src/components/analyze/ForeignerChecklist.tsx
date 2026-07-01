"use client"

import styles from "@/styles/App.module.css"

export function ForeignerChecklist() {
  return (
    <section className={`${styles.softCard} ${styles.stackSm}`}>
      <span className={styles.label}>외국인 접근성</span>
      <label><input type="checkbox" /> 영어 정보 제공</label>
      <label><input type="checkbox" /> 지도 링크 제공</label>
      <label><input type="checkbox" /> 대중교통 접근성 좋음</label>
    </section>
  )
}
