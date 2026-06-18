"use client"

import type { NotificationSettings as NotificationSettingsType } from "@/lib/types"
import styles from "@/styles/App.module.css"

interface NotificationSettingsProps {
  value: NotificationSettingsType
  onChange: (value: NotificationSettingsType) => void
}

const settingItems: Array<{ key: keyof NotificationSettingsType; label: string }> = [
  { key: "analysisCompleted", label: "분석 완료 알림" },
  { key: "reportResult", label: "신고 처리 결과 알림" },
  { key: "savedHospitalUpdated", label: "저장한 병원 정보 변경 알림" },
  { key: "securityAlert", label: "보안 알림" },
  { key: "marketing", label: "마케팅 알림" },
]

export function NotificationSettings({ value, onChange }: NotificationSettingsProps) {
  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>알림</h2>
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
