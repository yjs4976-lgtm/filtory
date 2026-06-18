"use client"

import type { AppTheme } from "@/services/settingService"
import styles from "@/styles/App.module.css"

interface ThemeSettingsProps {
  value: AppTheme
  onChange: (value: AppTheme) => void
}

export function ThemeSettings({ value, onChange }: ThemeSettingsProps) {
  const themes: Array<{ value: AppTheme; label: string }> = [
    { value: "system", label: "시스템 설정" },
    { value: "light", label: "라이트" },
    { value: "dark", label: "다크" },
  ]

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>화면 설정</h2>
      <p className={styles.mutedText}>테마 설정은 추후 전체 디자인 시스템과 연결할 예정이에요.</p>
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
