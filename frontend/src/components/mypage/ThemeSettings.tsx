"use client"

import { useLanguage } from "@/context/LanguageContext"
import type { AppTheme } from "@/services/settingService"
import styles from "@/styles/App.module.css"

interface ThemeSettingsProps {
  value: AppTheme
  onChange: (value: AppTheme) => void
}

export function ThemeSettings({ value, onChange }: ThemeSettingsProps) {
  const { t } = useLanguage()
  const themes: Array<{ value: AppTheme; label: string }> = [
    { value: "system", label: t.mypage.themeSystem },
    { value: "light", label: t.mypage.themeLight },
    { value: "dark", label: t.mypage.themeDark },
  ]

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>{t.mypage.displayTitle}</h2>
      <p className={styles.mutedText}>{t.mypage.displayDesc}</p>
      <div className={styles.segmented}>
        {themes.map((theme) => (
          <button
            key={theme.value}
            type="button"
            className={`${styles.segmentButton} ${value === theme.value ? styles.segmentButtonActive : ""}`}
            onClick={() => onChange(theme.value)}
          >
            {theme.label}
          </button>
        ))}
      </div>
    </section>
  )
}
