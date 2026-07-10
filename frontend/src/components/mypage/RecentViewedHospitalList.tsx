"use client"

import { useEffect, useState } from "react"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { useLanguage } from "@/context/LanguageContext"
import type { RecentViewedHospital } from "@/lib/types"
import { recentHospitalService } from "@/services/recentHospitalService"
import { RecentViewedHospitalCard } from "./RecentViewedHospitalCard"
import { RecentViewedHospitalEmpty } from "./RecentViewedHospitalEmpty"
import styles from "@/styles/App.module.css"

export function RecentViewedHospitalList() {
  const { t } = useLanguage()
  const [items, setItems] = useState<RecentViewedHospital[]>([])
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

  const handleDelete = async (id: number) => {
    const ok = window.confirm(t.mypage.deleteRecentConfirm)
    if (!ok) return
    await recentHospitalService.deleteRecentHospital(id)
    setItems((prevItems) => prevItems.filter((item) => item.id !== id))
  }

  const handleClear = async () => {
    const ok = window.confirm(t.mypage.clearRecentConfirm)
    if (!ok) return
    await recentHospitalService.clearRecentHospitals()
    setItems([])
  }

  if (isLoading) return <LoadingSpinner label={t.mypage.loadingRecentHospitals} />
  if (items.length === 0) return <RecentViewedHospitalEmpty />

  return (
    <section className={styles.stackSm}>
      <button type="button" className={styles.dangerButton} onClick={handleClear}>
        {t.mypage.clearAllRecords}
      </button>
      <div className={styles.recordList}>
        {items.map((hospital) => (
          <RecentViewedHospitalCard key={hospital.id} hospital={hospital} onDelete={handleDelete} onFavoriteChange={(id, favorite) => setItems((current) => current.map((item) => item.id === id ? { ...item, isFavorite: favorite } : item))} />
        ))}
      </div>
    </section>
  )
}
