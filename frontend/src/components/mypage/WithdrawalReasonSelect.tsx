"use client"

import styles from "@/styles/App.module.css"

interface WithdrawalReasonSelectProps {
  value: string
  onChange: (value: string) => void
}

const reasons = [
  "원하는 병원 정보를 찾기 어려워요",
  "분석 결과가 만족스럽지 않아요",
  "서비스를 자주 사용하지 않아요",
  "개인정보가 걱정돼요",
  "기타",
]

export function WithdrawalReasonSelect({ value, onChange }: WithdrawalReasonSelectProps) {
  return (
    <label className={styles.label}>
      탈퇴 사유
      <select className={styles.input} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">탈퇴 사유를 선택해주세요</option>
        {reasons.map((reason) => (
          <option key={reason} value={reason}>
            {reason}
          </option>
        ))}
      </select>
    </label>
  )
}
