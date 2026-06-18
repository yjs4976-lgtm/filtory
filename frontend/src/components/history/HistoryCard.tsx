"use client"

import { useRouter } from "next/navigation"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function HistoryCard({ item }) {
  const router = useRouter()
  const name = item.hospitalName ?? item.name?.ko ?? "분석 기록"
  const date = item.createdAt ?? item.date

  return (
    <button type="button" className={styles.recordButton} onClick={() => router.push(ROUTES.RESULT)}>
      <div className={styles.recordBody}>
        <p className={styles.recordName}>{name}</p>
        <p className={styles.recordDate}>{date}</p>
      </div>
      <span className={styles.score}>{item.score}</span>
    </button>
  )
}
