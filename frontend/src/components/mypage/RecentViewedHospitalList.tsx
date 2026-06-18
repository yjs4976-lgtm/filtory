"use client"

import { useEffect, useState } from "react"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import type { RecentViewedHospital } from "@/lib/types"
import { recentHospitalService } from "@/services/recentHospitalService"
import { RecentViewedHospitalCard } from "./RecentViewedHospitalCard"
import { RecentViewedHospitalEmpty } from "./RecentViewedHospitalEmpty"
import styles from "@/styles/App.module.css"

export function RecentViewedHospitalList() {
  const [items, setItems] = useState<RecentViewedHospital[]>([])
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true
    recentHospitalService.getRecentViewedHospitals().then((nextItems) => {
      if (!alive) return
      setItems(nextItems)
      setIsLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  const handleSave = (id: number) => {
    setMessage(`병원 ${id}번을 저장했어요. 실제 저장 API는 연결 예정입니다.`)
  }

  const handleDelete = async (id: number) => {
    const ok = window.confirm("이 최근 본 기록을 삭제할까요?")
    if (!ok) return
    await recentHospitalService.deleteRecentHospital(id)
    setItems((prevItems) => prevItems.filter((item) => item.id !== id))
  }

  const handleClear = async () => {
    const ok = window.confirm("최근 본 병원 기록을 모두 삭제할까요?")
    if (!ok) return
    await recentHospitalService.clearRecentHospitals()
    setItems([])
  }

  if (isLoading) return <LoadingSpinner label="최근 본 병원을 불러오고 있어요." />
  if (items.length === 0) return <RecentViewedHospitalEmpty />

  return (
    <section className={styles.stackSm}>
      {message && <p className={styles.formSuccess}>{message}</p>}
      <button type="button" className={styles.dangerButton} onClick={handleClear}>
        전체 기록 삭제
      </button>
      <div className={styles.recordList}>
        {items.map((hospital) => (
          <RecentViewedHospitalCard key={hospital.id} hospital={hospital} onSave={handleSave} onDelete={handleDelete} />
        ))}
      </div>
    </section>
  )
}
