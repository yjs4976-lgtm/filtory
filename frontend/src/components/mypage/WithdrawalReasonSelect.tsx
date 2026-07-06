"use client"

import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

interface WithdrawalReasonSelectProps {
  value: string
  onChange: (value: string) => void
}

export function WithdrawalReasonSelect({ value, onChange }: WithdrawalReasonSelectProps) {
  const { t } = useLanguage()
  const reasons = t.mypage.withdrawalReasons.map((label, index) => ({
    value: index === t.mypage.withdrawalReasons.length - 1 ? "other" : label,
    label,
  }))

  return (
    <label className={styles.label}>
      {t.mypage.withdrawalReasonLabel}
      <select className={styles.input} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{t.mypage.withdrawalReasonPlaceholder}</option>
        {reasons.map((reason) => (
          <option key={reason.value} value={reason.value}>
            {reason.label}
          </option>
        ))}
      </select>
    </label>
  )
}
