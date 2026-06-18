"use client"

import styles from "@/styles/App.module.css"

interface WithdrawalConfirmModalProps {
  open: boolean
  isSubmitting: boolean
  onClose: () => void
  onConfirm: () => void
}

export function WithdrawalConfirmModal({ open, isSubmitting, onClose, onConfirm }: WithdrawalConfirmModalProps) {
  if (!open) return null

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section className={`${styles.modalCard} ${styles.stackSm}`} role="dialog" aria-modal="true" aria-labelledby="withdraw-modal-title">
        <h2 id="withdraw-modal-title" className={styles.titleMd}>
          정말 탈퇴하시겠어요?
        </h2>
        <p className={styles.bodyText}>탈퇴하면 계정과 저장한 정보가 복구되지 않아요.</p>
        <div className={styles.actionRow}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={isSubmitting}>
            취소
          </button>
          <button type="button" className={styles.dangerButton} onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "처리 중..." : "탈퇴 확정"}
          </button>
        </div>
      </section>
    </div>
  )
}
