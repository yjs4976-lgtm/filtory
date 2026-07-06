"use client"

import { Sparkles } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function AnalyzeSubmitButton({ onClick, loading = false }) {
  const { t } = useLanguage()

  return (
    <button type="button" className={styles.primaryButton} onClick={onClick} disabled={loading}>
      <Sparkles className={styles.iconSm} />
      {loading ? t.analyze.submitting : t.analyze.submit}
    </button>
  )
}
