"use client"

import { useEffect, useMemo, useState } from "react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { CompareCategoryTabs } from "@/components/mypage/CompareCategoryTabs"
import { CompareEmptyState } from "@/components/mypage/CompareEmptyState"
import { CompareHospitalSelector } from "@/components/mypage/CompareHospitalSelector"
import { CompareSelectedList } from "@/components/mypage/CompareSelectedList"
import { HospitalCompareSummary } from "@/components/mypage/HospitalCompareSummary"
import { HospitalCompareTable } from "@/components/mypage/HospitalCompareTable"
import type { CompareHospital, CompareResult, HospitalCategory } from "@/lib/types"
import { compareService } from "@/services/compareService"
import { categoryLabels } from "@/services/memberMockData"
import styles from "@/styles/App.module.css"

export default function MyComparePage() {
  const [category, setCategory] = useState<HospitalCategory>("derma")
  const [hospitals, setHospitals] = useState<CompareHospital[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [result, setResult] = useState<CompareResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const timer = window.setTimeout(() => {
      setIsLoading(true)
      compareService.getCompareHospitalsByCategory(category).then((items) => {
        if (!alive) return
        setHospitals(items)
        setSelectedIds([])
        setResult(null)
        setIsLoading(false)
      })
    }, 0)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [category])

  const selectedHospitals = useMemo(
    () => hospitals.filter((hospital) => selectedIds.includes(hospital.id)),
    [hospitals, selectedIds]
  )

  const handleToggle = (id: number) => {
    setSelectedIds((prevIds) => {
      if (prevIds.includes(id)) return prevIds.filter((selectedId) => selectedId !== id)
      if (prevIds.length >= 3) return prevIds
      return [...prevIds, id]
    })
  }

  const handleCompare = async () => {
    if (selectedIds.length < 2) return
    const nextResult = await compareService.compareHospitals(category, selectedIds)
    setResult(nextResult)
  }

  return (
    <ProtectedRoute>
      <AppShell title="분야별 병원 비교" showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>분야별 병원 비교</h1>
          <p className={styles.bodyText}>
            피부과는 피부과끼리, 안과는 안과끼리, 치과는 치과끼리 비교해 더 정확한 선택을 도와드려요.
          </p>
        </section>
        <CompareCategoryTabs value={category} onChange={setCategory} />
        {isLoading ? (
          <LoadingSpinner label="비교할 병원을 불러오고 있어요." />
        ) : hospitals.length === 0 ? (
          <CompareEmptyState categoryLabel={categoryLabels[category]} />
        ) : (
          <>
            <CompareHospitalSelector hospitals={hospitals} selectedIds={selectedIds} onToggle={handleToggle} />
            <CompareSelectedList hospitals={selectedHospitals} />
            <button className={styles.primaryButton} type="button" disabled={selectedIds.length < 2} onClick={handleCompare}>
              비교하기
            </button>
            {selectedIds.length < 2 && <p className={styles.mutedText}>비교하려면 최소 2개의 병원이 필요해요.</p>}
            {result && (
              <>
                <HospitalCompareSummary result={result} />
                <HospitalCompareTable category={category} hospitals={result.hospitals} />
              </>
            )}
          </>
        )}
      </AppShell>
    </ProtectedRoute>
  )
}
