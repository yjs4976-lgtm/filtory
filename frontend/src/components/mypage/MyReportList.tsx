"use client"

import { useEffect, useState } from "react"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import type { MyReport } from "@/lib/types"
import { reportService } from "@/services/reportService"
import { MyReportCard } from "./MyReportCard"
import { MyReportEmpty } from "./MyReportEmpty"
import styles from "@/styles/App.module.css"

export function MyReportList() {
  const [reports, setReports] = useState<MyReport[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true
    reportService.getMyReports().then((items) => {
      if (!alive) return
      setReports(items)
      setIsLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  const handleCancel = async (id: number) => {
    const ok = window.confirm("이 신고를 취소할까요?")
    if (!ok) return
    await reportService.cancelReport(id)
    setReports((prevItems) => prevItems.filter((item) => item.id !== id))
  }

  if (isLoading) return <LoadingSpinner label="신고 내역을 불러오고 있어요." />
  if (reports.length === 0) return <MyReportEmpty />

  return (
    <section className={styles.recordList}>
      {reports.map((report) => (
        <MyReportCard key={report.id} report={report} onCancel={handleCancel} />
      ))}
    </section>
  )
}
