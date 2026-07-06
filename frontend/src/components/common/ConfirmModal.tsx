"use client"

import styles from "@/styles/App.module.css"
import { useLanguage } from "@/context/LanguageContext"

export function ConfirmModal({ open, title, description, onCancel, onConfirm }) {
  const { t } = useLanguage()

  if (!open) return null

  return (
    <div className={styles.card} role="dialog" aria-modal="true">
      <div className={styles.stackSm}>
        <h2 className={styles.titleMd}>{title}</h2>
        <p className={styles.mutedText}>{description}</p>
        <div className={styles.stackSm}>
          <button type="button" className={styles.dangerButton} onClick={onConfirm}>
            {t.common.confirm}
          </button>
          <button type="button" className={styles.secondaryButton} onClick={onCancel}>
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}
