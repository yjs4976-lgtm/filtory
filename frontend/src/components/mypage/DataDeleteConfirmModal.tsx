"use client"

import styles from "@/styles/App.module.css"
import { useLanguage } from "@/context/LanguageContext"

interface DataDeleteConfirmModalProps {
  title: string
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DataDeleteConfirmModal({ title, open, onClose, onConfirm }: DataDeleteConfirmModalProps) {
  const { t } = useLanguage()
  if (!open) return null

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section className={`${styles.modalCard} ${styles.stackSm}`} role="dialog" aria-modal="true">
        <h2 className={styles.titleMd}>{title}</h2>
        <p className={styles.bodyText}>{t.mypage.irreversible}</p>
        <div className={styles.actionRow}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            {t.common.cancel}
          </button>
          <button type="button" className={styles.dangerButton} onClick={onConfirm}>
            {t.mypage.delete}
          </button>
        </div>
      </section>
    </div>
  )
}
