"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import styles from "@/styles/App.module.css"

interface PasswordFieldProps {
  id?: string
  label: string
  value: string
  placeholder?: string
  autoComplete?: string
  minLength?: number
  showLabel?: string
  hideLabel?: string
  onChange: (value: string) => void
}

export function PasswordField({
  id,
  label,
  value,
  placeholder,
  autoComplete,
  minLength,
  showLabel = "비밀번호 보기",
  hideLabel = "비밀번호 숨기기",
  onChange,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const buttonLabel = visible ? hideLabel : showLabel
  const Icon = visible ? EyeOff : Eye

  return (
    <label className={styles.label} htmlFor={id}>
      {label}
      <span className={styles.passwordField}>
        <input
          id={id}
          className={styles.input}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          minLength={minLength}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className={styles.passwordToggle}
          aria-label={buttonLabel}
          title={buttonLabel}
          onClick={() => setVisible((current) => !current)}
        >
          <Icon className={styles.iconSm} />
        </button>
      </span>
    </label>
  )
}
