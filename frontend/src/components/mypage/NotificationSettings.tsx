"use client"

import type { NotificationSettings as NotificationSettingsType } from "@/lib/types"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

interface NotificationSettingsProps {
  value: NotificationSettingsType
  onChange: (value: NotificationSettingsType) => void
}

export function NotificationSettings({ value, onChange }: NotificationSettingsProps) {
  const { t } = useLanguage()
  const settingItems: Array<{ key: keyof NotificationSettingsType; label: string }> = [
    { key: "analysisCompleted", label: t.mypage.notificationAnalysis },
    { key: "reportResult", label: t.mypage.notificationReport },
    { key: "savedHospitalUpdated", label: t.mypage.notificationSavedHospital },
    { key: "securityAlert", label: t.mypage.notificationSecurity },
    { key: "marketing", label: t.mypage.notificationMarketing },
  ]
  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>{t.mypage.notificationSettingsHeading}</h2>
      {settingItems.map((item) => (
        <label key={item.key} className={styles.settingToggleRow}>
          <span>{item.label}</span>
          <input
            type="checkbox"
            checked={value[item.key]}
            onChange={(event) => onChange({ ...value, [item.key]: event.target.checked })}
          />
        </label>
      ))}
    </section>
  )
}
