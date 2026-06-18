"use client"

import styles from "@/styles/App.module.css"

export function HospitalInfoForm({ hospital, naver, google, onChange }) {
  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <input className={styles.input} value={hospital} onChange={(event) => onChange("hospital", event.target.value)} placeholder="병원명" />
      <input className={styles.input} value={naver} onChange={(event) => onChange("naver", event.target.value)} placeholder="네이버 플레이스 링크" />
      <input className={styles.input} value={google} onChange={(event) => onChange("google", event.target.value)} placeholder="구글 맵스 링크" />
    </section>
  )
}
