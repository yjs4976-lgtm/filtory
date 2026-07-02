"use client"

import { useEffect, useState } from "react"
import { EmptyState } from "@/components/common/EmptyState"
import { LoginRequiredCard } from "@/components/common/LoginRequiredCard"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import type { AnalysisHistoryItem } from "@/lib/types"
import { getHistory } from "@/services/historyService"
import { HistoryCard } from "./HistoryCard"
import styles from "@/styles/App.module.css"

interface HistoryListProps {
  items?: AnalysisHistoryItem[]
  compact?: boolean
  previewLimit?: number
  showPreviewSummary?: boolean
}

export function HistoryList({ items, compact = false, previewLimit, showPreviewSummary = false }: HistoryListProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { t } = useLanguage()
  const [fetchedRecords, setFetchedRecords] = useState<AnalysisHistoryItem[] | null>(null)
  const records = items ?? fetchedRecords ?? []
  const visibleRecords = previewLimit ? records.slice(0, previewLimit) : records
  const loading = !items && !isLoading && isAuthenticated && fetchedRecords === null

  useEffect(() => {
    let alive = true

    if (items) return

    if (isLoading) return

    if (!isAuthenticated) return

    getHistory(user?.id)
      .then((nextRecords) => {
        if (alive) setFetchedRecords(nextRecords)
      })
      .catch(() => {
        if (alive) setFetchedRecords([])
      })

    return () => {
      alive = false
    }
  }, [items, isAuthenticated, isLoading, user?.id])

  if (isLoading || loading) {
    return <LoadingSpinner label={t.history.loading} />
  }

  if (!isAuthenticated && !items) {
    return (
      <LoginRequiredCard
        title={t.history.loginRequiredTitle}
        description={t.history.loginRequiredDescription}
        showSignup={false}
        secondaryLabel={t.history.analyzeFirst}
      />
    )
  }

  if (records.length === 0) {
    return (
      <EmptyState
        title={compact ? t.home.emptyRecentCompactTitle : t.history.emptyTitle}
        description={compact ? t.home.emptyRecentDescription : t.history.emptyDescription}
        actionHref={ROUTES.ANALYZE}
        actionLabel={t.history.emptyAction}
      />
    )
  }

  return (
    <section className={styles.recordList}>
      {visibleRecords.map((item) => (
        <HistoryCard key={item.id} item={item} />
      ))}
      {showPreviewSummary && previewLimit && records.length > previewLimit && (
        <p className={styles.recentPreviewSummary}>
          {t.home.recentPreviewSummary
            .replace("{visible}", String(previewLimit))
            .replace("{total}", String(records.length))}
        </p>
      )}
    </section>
  )
}
