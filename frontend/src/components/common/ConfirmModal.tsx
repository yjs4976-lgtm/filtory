"use client"

import styles from "@/styles/App.module.css"

export function ConfirmModal({ open, title, description, onCancel, onConfirm }) {
  if (!open) return null

  return (
    <div className={styles.card} role="dialog" aria-modal="true">
      <div className={styles.stackSm}>
        <h2 className={styles.titleMd}>{title}</h2>
        <p className={styles.mutedText}>{description}</p>
        <div className={styles.stackSm}>
          <button type="button" className={styles.dangerButton} onClick={onConfirm}>
            확인
          </button>
          <button type="button" className={styles.secondaryButton} onClick={onCancel}>
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
