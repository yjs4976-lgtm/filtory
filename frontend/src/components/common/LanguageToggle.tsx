"use client"

import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <div className={styles.languageToggle}>
      <button
        type="button"
        onClick={() => setLanguage("ko")}
        aria-pressed={language === "ko"}
        className={[styles.languageButton, language === "ko" ? styles.languageButtonActive : ""].join(" ")}
      >
        {t.common.langKo}
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        className={[styles.languageButton, language === "en" ? styles.languageButtonActive : ""].join(" ")}
      >
        {t.common.langEn}
      </button>
    </div>
  )
}
