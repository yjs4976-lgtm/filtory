"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { SavedHospitalEmpty } from "@/components/mypage/SavedHospitalEmpty"
import { SavedHospitalList } from "@/components/mypage/SavedHospitalList"
import type { SavedHospital } from "@/lib/types"
import { savedHospitalService } from "@/services/savedHospitalService"
import styles from "@/styles/App.module.css"

export default function MySavedHospitalsPage() {
  const [hospitals, setHospitals] = useState<SavedHospital[]>([])
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true
    savedHospitalService.getSavedHospitals().then((items) => {
      if (!alive) return
      setHospitals(items)
      setIsLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  const handleAddToCompare = async (id: number) => {
    await savedHospitalService.addToCompare(id)
    setMessage("비교함에 추가했어요. 같은 분야 병원끼리 비교할 수 있어요.")
  }

  const handleUnsave = async (id: number) => {
    const ok = window.confirm("저장한 병원에서 해제할까요?")
    if (!ok) return
    await savedHospitalService.unsaveHospital(id)
    setHospitals((prevItems) => prevItems.filter((item) => item.id !== id))
  }

  return (
    <ProtectedRoute>
      <AppShell title="저장한 병원" showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>저장한 병원</h1>
          <p className={styles.bodyText}>나중에 다시 확인하고 싶은 병원을 모아볼 수 있어요.</p>
        </section>
        {message && <p className={styles.formSuccess}>{message}</p>}
        {isLoading ? (
          <LoadingSpinner label="저장한 병원을 불러오고 있어요." />
        ) : hospitals.length === 0 ? (
          <SavedHospitalEmpty />
        ) : (
          <SavedHospitalList
            hospitals={hospitals}
            preview={false}
            onAddToCompare={handleAddToCompare}
            onUnsave={handleUnsave}
          />
        )}
      </AppShell>
    </ProtectedRoute>
  )
}
