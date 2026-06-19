"use client"

import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function LanguageSettings() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>{t.mypage.languageTitle}</h2>
      <div className={styles.segmented}>
        <button
          type="button"
          className={`${styles.segmentButton} ${language === "ko" ? styles.segmentButtonActive : ""}`}
          onClick={() => setLanguage("ko")}
        >
          {t.common.langKo}
        </button>
        <button
          type="button"
          className={`${styles.segmentButton} ${language === "en" ? styles.segmentButtonActive : ""}`}
          onClick={() => setLanguage("en")}
        >
          {t.common.langEn}
        </button>
      </div>
    </section>
  )
}
