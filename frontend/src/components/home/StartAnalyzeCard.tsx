"use client"

import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function StartAnalyzeCard() {
  const router = useRouter()

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>새 분석 시작</h2>
      <button type="button" className={styles.primaryButton} onClick={() => router.push(ROUTES.ANALYZE)}>
        <Sparkles className={styles.iconSm} />
        AI 분석 시작하기
      </button>
    </section>
  )
}
