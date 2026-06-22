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
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import type { CompareHospital, CompareResult, HospitalCategory } from "@/lib/types"
import { compareService } from "@/services/compareService"
import styles from "@/styles/App.module.css"

export default function MyComparePage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [category, setCategory] = useState<HospitalCategory>("derma")
  const [hospitals, setHospitals] = useState<CompareHospital[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [result, setResult] = useState<CompareResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const timer = window.setTimeout(() => {
      setIsLoading(true)
      compareService.getCompareHospitalsByCategory(category, user?.id).then((items) => {
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
  }, [category, user?.id])

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
    const nextResult = await compareService.compareHospitals(category, selectedIds, user?.id)
    setResult(nextResult)
  }

  return (
    <ProtectedRoute>
      <AppShell title={t.mypage.menu.compare} showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>{t.mypage.menu.compare}</h1>
          <p className={styles.bodyText}>{t.mypage.menu.compareDesc}</p>
        </section>
        <CompareCategoryTabs value={category} onChange={setCategory} />
        {isLoading ? (
          <LoadingSpinner label={t.mypage.loadingCompareHospitals} />
        ) : hospitals.length === 0 ? (
          <CompareEmptyState />
        ) : (
          <>
            <CompareHospitalSelector hospitals={hospitals} selectedIds={selectedIds} onToggle={handleToggle} />
            <CompareSelectedList hospitals={selectedHospitals} />
            <button className={styles.primaryButton} type="button" disabled={selectedIds.length < 2} onClick={handleCompare}>
              {t.mypage.compareAction}
            </button>
            {selectedIds.length < 2 && <p className={styles.mutedText}>{t.mypage.compareMinRequired}</p>}
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
