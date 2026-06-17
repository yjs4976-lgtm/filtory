"use client"

import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className={styles.languageToggle}>
      <button
        type="button"
        onClick={() => setLanguage("ko")}
        aria-pressed={language === "ko"}
        className={[styles.languageButton, language === "ko" ? styles.languageButtonActive : ""].join(" ")}
      >
        한국어
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        className={[styles.languageButton, language === "en" ? styles.languageButtonActive : ""].join(" ")}
      >
        English
      </button>
    </div>
  )
}
