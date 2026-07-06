"use client"

import { useCallback, useEffect, useState } from "react"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import type { AnalysisHistoryItem, HospitalCategory } from "@/lib/types"
import {
  analysisHistoryService,
  filterAndSortAnalysisHistory,
  type AnalysisHistorySort,
  type TrustFilter,
} from "@/services/analysisHistoryService"
import { AnalysisHistoryCard } from "./AnalysisHistoryCard"
import { AnalysisHistoryEmpty } from "./AnalysisHistoryEmpty"
import { AnalysisHistoryFilter } from "./AnalysisHistoryFilter"
import { TrustLevelGuide } from "./TrustLevelGuide"
import styles from "@/styles/App.module.css"

const PAGE_SIZE = 5

export function AnalysisHistoryList() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [searchInput, setSearchInput] = useState("")
  const [appliedSearchKeyword, setAppliedSearchKeyword] = useState("")
  const [category, setCategory] = useState<"all" | HospitalCategory>("all")
  const [trust, setTrust] = useState<TrustFilter>("all")
  const [sort, setSort] = useState<AnalysisHistorySort>("latest")
  const [histories, setHistories] = useState<AnalysisHistoryItem[]>([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const loadItems = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")
      const nextItems = await analysisHistoryService.getAnalysisHistory(user?.id)
      setHistories(nextItems)
    } catch (error) {
      setError(error instanceof Error ? error.message : t.mypage.loadHistoryFailed)
    } finally {
      setIsLoading(false)
    }
  }, [t.mypage.loadHistoryFailed, user])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadItems()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadItems])

  const filteredHistories = filterAndSortAnalysisHistory(histories, {
    keyword: appliedSearchKeyword,
    category,
    trust,
    sort,
  })
  const totalPages = Math.max(1, Math.ceil(filteredHistories.length / PAGE_SIZE))
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages))
  const visibleItems = filteredHistories.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE)
  const searchInputLength = searchInput.trim().length
  const isShortSearchInput = searchInputLength === 1
  const isFilteredView = appliedSearchKeyword.trim().length >= 2 || category !== "all" || trust !== "all"
  const countLabel = (isFilteredView ? t.history.searchResultCount : t.history.recordCount).replace(
    "{count}",
    String(filteredHistories.length)
  )

  const applySearchInput = (value: string, isComposing = false) => {
    const trimmed = value.trim()
    setSearchInput(value)
    if (isComposing) return
    setAppliedSearchKeyword(trimmed.length >= 2 ? trimmed : "")
    setCurrentPage(1)
  }

  const resetSearchAndFilters = () => {
    setSearchInput("")
    setAppliedSearchKeyword("")
    setCategory("all")
    setTrust("all")
    setSort("latest")
    setCurrentPage(1)
  }

  const handleDelete = async (id: string) => {
    const ok = window.confirm(t.mypage.deleteHistoryConfirm)
    if (!ok) return
    await analysisHistoryService.deleteAnalysisHistory(user?.id, id)
    setHistories((prevItems) => prevItems.filter((item) => item.id !== id))
  }

  return (
    <section className={styles.stackMd}>
      <AnalysisHistoryFilter
        keyword={searchInput}
        category={category}
        trust={trust}
        sort={sort}
        onKeywordChange={applySearchInput}
        onCategoryChange={(value) => {
          setCategory(value)
          setCurrentPage(1)
        }}
        onTrustChange={(value) => {
          setTrust(value)
          setCurrentPage(1)
        }}
        onSortChange={(value) => {
          setSort(value)
          setCurrentPage(1)
        }}
        onResetSearch={resetSearchAndFilters}
      />
      <TrustLevelGuide />
      {isLoading && <LoadingSpinner label={t.mypage.loadingHistory} />}
      {error && <p className={styles.formError}>{error}</p>}
      {!isLoading && !error && histories.length === 0 && <AnalysisHistoryEmpty />}
      {!isLoading && !error && histories.length > 0 && filteredHistories.length === 0 && (
        <section className={`${styles.emptyCard} ${styles.stackSm}`}>
          <h2 className={styles.titleMd}>{t.history.searchEmptyTitle}</h2>
          <p className={styles.mutedText}>{t.history.searchEmptyDescription}</p>
          <button type="button" className={styles.primaryButton} onClick={resetSearchAndFilters}>
            {t.history.resetSearch}
          </button>
        </section>
      )}
      {!isLoading && !error && histories.length > 0 && filteredHistories.length > 0 && (
        <>
          <div className={styles.historyCountRow}>
            <p className={styles.mutedText}>{countLabel}</p>
            {isShortSearchInput && <p className={styles.searchHint}>{t.history.searchMinLengthHint}</p>}
          </div>
          <div className={styles.recordList}>
            {visibleItems.map((item) => (
              <AnalysisHistoryCard key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className={styles.paginationControls}>
              <button type="button" className={styles.pageButton} disabled={safeCurrentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
                {t.history.previous}
              </button>
              <span className={styles.pageIndicator}>{safeCurrentPage} / {totalPages}</span>
              <button type="button" className={styles.pageButton} disabled={safeCurrentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
                {t.history.next}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
