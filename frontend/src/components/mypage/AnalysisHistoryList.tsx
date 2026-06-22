"use client"

import { useCallback, useEffect, useState } from "react"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import type { AnalysisHistoryItem, HospitalCategory } from "@/lib/types"
import {
  analysisHistoryService,
  type AnalysisHistorySort,
  type TrustFilter,
} from "@/services/analysisHistoryService"
import { AnalysisHistoryCard } from "./AnalysisHistoryCard"
import { AnalysisHistoryEmpty } from "./AnalysisHistoryEmpty"
import { AnalysisHistoryFilter } from "./AnalysisHistoryFilter"
import { TrustLevelGuide } from "./TrustLevelGuide"
import styles from "@/styles/App.module.css"

export function AnalysisHistoryList() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [keyword, setKeyword] = useState("")
  const [category, setCategory] = useState<"all" | HospitalCategory>("all")
  const [trust, setTrust] = useState<TrustFilter>("all")
  const [sort, setSort] = useState<AnalysisHistorySort>("latest")
  const [items, setItems] = useState<AnalysisHistoryItem[]>([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const loadItems = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")
      const nextItems = await analysisHistoryService.getAnalysisHistory(user?.id, { keyword, category, trust, sort })
      setItems(nextItems)
    } catch (error) {
      setError(error instanceof Error ? error.message : t.mypage.loadHistoryFailed)
    } finally {
      setIsLoading(false)
    }
  }, [category, keyword, sort, trust, t.mypage.loadHistoryFailed, user])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadItems()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadItems])

  const handleDelete = async (id: string) => {
    const ok = window.confirm(t.mypage.deleteHistoryConfirm)
    if (!ok) return
    await analysisHistoryService.deleteAnalysisHistory(user?.id, id)
    setItems((prevItems) => prevItems.filter((item) => item.id !== id))
  }

  return (
    <section className={styles.stackMd}>
      <AnalysisHistoryFilter
        keyword={keyword}
        category={category}
        trust={trust}
        sort={sort}
        onKeywordChange={setKeyword}
        onCategoryChange={setCategory}
        onTrustChange={setTrust}
        onSortChange={setSort}
      />
      <TrustLevelGuide />
      {isLoading && <LoadingSpinner label={t.mypage.loadingHistory} />}
      {error && <p className={styles.formError}>{error}</p>}
      {!isLoading && !error && items.length === 0 && <AnalysisHistoryEmpty />}
      {!isLoading && !error && items.length > 0 && (
        <div className={styles.recordList}>
          {items.map((item) => (
            <AnalysisHistoryCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </section>
  )
}
