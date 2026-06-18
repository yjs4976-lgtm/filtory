"use client"

import { Sparkles } from "lucide-react"
import styles from "@/styles/App.module.css"

export function AnalyzeSubmitButton({ onClick, loading = false }) {
  return (
    <button type="button" className={styles.primaryButton} onClick={onClick} disabled={loading}>
      <Sparkles className={styles.iconSm} />
      {loading ? "분석 중..." : "AI 분석 시작하기"}
    </button>
  )
}
