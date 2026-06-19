"use client"

import styles from "@/styles/App.module.css"
import { useLanguage } from "@/context/LanguageContext"

interface WithdrawalConfirmModalProps {
  open: boolean
  isSubmitting: boolean
  onClose: () => void
  onConfirm: () => void
}

export function WithdrawalConfirmModal({ open, isSubmitting, onClose, onConfirm }: WithdrawalConfirmModalProps) {
  const { t } = useLanguage()
  if (!open) return null

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section className={`${styles.modalCard} ${styles.stackSm}`} role="dialog" aria-modal="true" aria-labelledby="withdraw-modal-title">
        <h2 id="withdraw-modal-title" className={styles.titleMd}>
          {t.mypage.confirmDeleteTitle}
        </h2>
        <p className={styles.bodyText}>{t.mypage.confirmDeleteDescription}</p>
        <div className={styles.actionRow}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={isSubmitting}>
            {t.common.cancel}
          </button>
          <button type="button" className={styles.dangerButton} onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? t.mypage.withdrawalSubmitting : t.mypage.confirmDeleteAction}
          </button>
        </div>
      </section>
    </div>
  )
}
