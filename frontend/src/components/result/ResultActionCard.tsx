"use client"

import { useRouter } from "next/navigation"
import { FileText, LogIn } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function ResultActionCard() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <section className={`${styles.softCard} ${styles.stackSm}`}>
        <h2 className={styles.titleSm}>분석은 완료됐어요!</h2>
        <p className={styles.mutedText}>이 결과를 나중에 다시 보려면 로그인하고 저장해보세요.</p>
        <div className={styles.actionRow}>
          <button type="button" className={styles.primaryButton} onClick={() => router.push(ROUTES.LOGIN)}>
            <LogIn className={styles.iconSm} />
            로그인하고 저장하기
          </button>
          <button type="button" className={styles.secondaryButton}>
            그냥 보기
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className={`${styles.softCard} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>분석 결과가 내 기록에 저장되었어요.</h2>
      <button type="button" className={styles.primaryButton} onClick={() => router.push(ROUTES.HISTORY)}>
        <FileText className={styles.iconSm} />
        내 기록 보기
      </button>
    </section>
  )
}
