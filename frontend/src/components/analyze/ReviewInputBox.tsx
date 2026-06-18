"use client"

import styles from "@/styles/App.module.css"

export function ReviewInputBox({ value, onChange }) {
  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <label className={styles.label} htmlFor="review-input">리뷰 텍스트</label>
      <textarea id="review-input" className={styles.textarea} value={value} onChange={(event) => onChange(event.target.value)} placeholder="분석할 리뷰 내용을 붙여넣어 주세요." />
    </section>
  )
}
