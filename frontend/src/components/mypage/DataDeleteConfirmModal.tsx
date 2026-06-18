"use client"

import styles from "@/styles/App.module.css"

interface DataDeleteConfirmModalProps {
  title: string
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DataDeleteConfirmModal({ title, open, onClose, onConfirm }: DataDeleteConfirmModalProps) {
  if (!open) return null

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section className={`${styles.modalCard} ${styles.stackSm}`} role="dialog" aria-modal="true">
        <h2 className={styles.titleMd}>{title}</h2>
        <p className={styles.bodyText}>이 작업은 되돌릴 수 없어요.</p>
        <div className={styles.actionRow}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            취소
          </button>
          <button type="button" className={styles.dangerButton} onClick={onConfirm}>
            삭제
          </button>
        </div>
      </section>
    </div>
  )
}
