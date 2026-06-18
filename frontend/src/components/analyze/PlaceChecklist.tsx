"use client"

import styles from "@/styles/App.module.css"

export function PlaceChecklist() {
  return (
    <section className={`${styles.softCard} ${styles.stackSm}`}>
      <span className={styles.label}>플레이스 완성도</span>
      <label><input type="checkbox" /> 진료시간 정보 있음</label>
      <label><input type="checkbox" /> 사진 또는 소개 정보 있음</label>
      <label><input type="checkbox" /> 예약/문의 정보 있음</label>
    </section>
  )
}
