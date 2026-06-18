"use client"

import { useEffect, useState } from "react"
import { CalendarDays, ChartNoAxesColumnIncreasing, Gauge, Stethoscope } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import type { AnalysisHistoryItem } from "@/lib/types"
import { getHistory } from "@/services/historyService"
import styles from "@/styles/App.module.css"

interface MyAnalysisSummaryProps {
  records?: AnalysisHistoryItem[]
}

function formatDate(value?: string, emptyText = "-") {
  if (!value) return emptyText
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

export function MyAnalysisSummary({ records: recordsProp }: MyAnalysisSummaryProps) {
  const { t } = useLanguage()
  const [fetchedRecords, setFetchedRecords] = useState<AnalysisHistoryItem[]>([])
  const records = recordsProp ?? fetchedRecords

  useEffect(() => {
    if (recordsProp) return

    let alive = true
    getHistory().then((items) => {
      if (alive) setFetchedRecords(items)
    })
    return () => {
      alive = false
    }
  }, [recordsProp])

  const averageScore = records.length
    ? Math.round(records.reduce((sum, item) => sum + item.score, 0) / records.length)
    : null

  const categoryCounts = records.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1
    return acc
  }, {})
  const favoriteCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const favoriteCategoryLabel = favoriteCategory
    ? t.categories[favoriteCategory as keyof typeof t.categories] ?? favoriteCategory
    : "-"

  const summaryItems = [
    {
      label: t.mypage.totalAnalyses,
      value: `${records.length}${t.mypage.countSuffix}`,
      icon: ChartNoAxesColumnIncreasing,
    },
    {
      label: t.mypage.averageTrust,
      value: averageScore === null ? "-" : `${averageScore}${t.mypage.pointsSuffix}`,
      icon: Gauge,
    },
    {
      label: t.mypage.latestAnalysisDate,
      value: formatDate(records[0]?.createdAt, t.mypage.noRecentDate),
      icon: CalendarDays,
    },
    {
      label: t.mypage.favoriteCategory,
      value: favoriteCategoryLabel,
      icon: Stethoscope,
    },
  ]

  return (
    <section className={styles.stackSm}>
      <h2 className={styles.titleSm}>{t.mypage.analysisSummary}</h2>
      <div className={styles.summaryGrid}>
        {summaryItems.map(({ label, value, icon: Icon }) => (
          <article key={label} className={styles.summaryCard}>
            <span className={`${styles.iconBoxSmall} ${styles.iconMint}`}>
              <Icon className={styles.iconSm} />
            </span>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
    </section>
  )
}
