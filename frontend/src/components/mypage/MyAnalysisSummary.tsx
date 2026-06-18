"use client"

import { useEffect, useState } from "react"
import { CalendarDays, ChartNoAxesColumnIncreasing, Gauge } from "lucide-react"
import type { AnalysisHistoryItem } from "@/lib/types"
import { getHistory } from "@/services/historyService"
import styles from "@/styles/App.module.css"

export function MyAnalysisSummary() {
  const [records, setRecords] = useState<AnalysisHistoryItem[]>([])

  useEffect(() => {
    let alive = true
    getHistory().then((items) => {
      if (alive) setRecords(items)
    })
    return () => {
      alive = false
    }
  }, [])

  const averageScore = records.length
    ? Math.round(records.reduce((sum, item) => sum + item.score, 0) / records.length)
    : null
  const latestDate = records[0]?.createdAt || "아직 없음"

  const summaryItems = [
    { label: "총 분석 횟수", value: `${records.length}회`, icon: ChartNoAxesColumnIncreasing },
    { label: "최근 분석 날짜", value: latestDate, icon: CalendarDays },
    { label: "평균 신뢰도", value: averageScore === null ? "-" : `${averageScore}점`, icon: Gauge },
  ]

  return (
    <section className={styles.summaryGrid}>
      {summaryItems.map(({ label, value, icon: Icon }) => (
        <article key={label} className={styles.summaryCard}>
          <span className={`${styles.iconBoxSmall} ${styles.iconMint}`}>
            <Icon className={styles.iconSm} />
          </span>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  )
}
