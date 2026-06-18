"use client"

import styles from "@/styles/App.module.css"

export default function Error({ reset }) {
  return (
    <main className={`${styles.main} ${styles.stackSm}`}>
      <h1 className={styles.titleLg}>오류가 발생했어요</h1>
      <p className={styles.bodyText}>잠시 후 다시 시도해 주세요.</p>
      <button type="button" className={styles.primaryButton} onClick={reset}>다시 시도</button>
    </main>
  )
}
