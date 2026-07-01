"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { RotateCcw, ShieldCheck, Trash2 } from "lucide-react"
import { EmptyState } from "@/components/common/EmptyState"
import { LoginRequiredCard } from "@/components/common/LoginRequiredCard"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import { formatSignalLevel, getTrustLevel, getTrustLevelKeyFromValue } from "@/lib/score"
import type { AnalysisHistoryItem, HospitalCategory } from "@/lib/types"
import { analysisHistoryService, type AnalysisHistorySort } from "@/services/analysisHistoryService"
import styles from "@/styles/App.module.css"

type HistoryMode = "active" | "trash"

type ConfirmAction = {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => Promise<void> | void
}

const categoryOptions: Array<"all" | HospitalCategory> = ["all", "derma", "eye", "dental"]

function selectedText(template: string, count: number) {
  return template.replace("{count}", String(count))
}

export function HistoryManager({ mode = "active" }: { mode?: HistoryMode }) {
  const { t } = useLanguage()
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const isTrashMode = mode === "trash"
  const [keyword, setKeyword] = useState("")
  const [category, setCategory] = useState<"all" | HospitalCategory>("all")
  const [sort, setSort] = useState<AnalysisHistorySort>("latest")
  const [items, setItems] = useState<AnalysisHistoryItem[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isManageMode, setIsManageMode] = useState(isTrashMode)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [feedback, setFeedback] = useState("")
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const hasSelection = selectedIds.length > 0

  const loadItems = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError("")
      const filters = { keyword, category, sort }
      const nextItems = isTrashMode
        ? await analysisHistoryService.getTrashHistory(user?.id, filters)
        : await analysisHistoryService.getAnalysisHistory(user?.id, filters)
      setItems(nextItems)
      setSelectedIds((current) => current.filter((id) => nextItems.some((item) => item.id === id)))
    } catch (error) {
      setError(error instanceof Error ? error.message : t.history.loadFailed)
    } finally {
      setIsLoading(false)
    }
  }, [category, isAuthenticated, isTrashMode, keyword, sort, t.history.loadFailed, user])

  useEffect(() => {
    if (isAuthLoading) return
    const timer = window.setTimeout(() => {
      loadItems()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [isAuthLoading, loadItems])

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]))
  }

  const selectAll = () => setSelectedIds(items.map((item) => item.id))
  const clearSelection = () => setSelectedIds([])

  const runConfirmed = async () => {
    if (!confirmAction) return
    await confirmAction.onConfirm()
    setConfirmAction(null)
  }

  const afterAction = async (message: string) => {
    setFeedback(message)
    setSelectedIds([])
    setIsManageMode(false)
    await loadItems()
  }

  const moveSelectedToTrash = async (ids = selectedIds) => {
    await analysisHistoryService.moveAnalysisHistoryToTrash(user?.id, ids)
    await afterAction(t.history.moveToTrashDone)
  }

  const restoreSelected = async (ids = selectedIds) => {
    await analysisHistoryService.restoreAnalysisHistory(user?.id, ids)
    await afterAction(t.history.restoreDone)
  }

  const permanentlyDeleteSelected = async (ids = selectedIds) => {
    await analysisHistoryService.hardDeleteAnalysisHistory(user?.id, ids)
    await afterAction(t.history.permanentDeleteDone)
  }

  const emptyTrash = async () => {
    await analysisHistoryService.emptyTrash(user?.id)
    await afterAction(t.history.emptyTrashDone)
  }

  if (isAuthLoading || isLoading) {
    return <LoadingSpinner label={t.history.loading} />
  }

  if (!isAuthenticated) {
    return (
      <LoginRequiredCard
        title={t.history.loginRequiredTitle}
        description={t.history.loginRequiredDescription}
        showSignup={false}
        secondaryLabel={t.history.analyzeFirst}
      />
    )
  }

  return (
    <section className={styles.stackMd}>
      <section className={`${styles.card} ${styles.stackSm}`}>
        <p className={styles.memberEyebrow}>{isTrashMode ? "TRASH" : "HISTORY"}</p>
        <h2 className={styles.titleMd}>{isTrashMode ? t.history.trashTitle : t.history.title}</h2>
        <p className={styles.bodyText}>{isTrashMode ? t.history.trashDescription : t.history.description}</p>
        <div className={styles.actionRow}>
          <Link className={styles.secondaryButton} href={isTrashMode ? ROUTES.HISTORY : ROUTES.HISTORY_TRASH}>
            {isTrashMode ? t.history.backToHistory : t.history.openTrash}
          </Link>
        </div>
      </section>

      <HistoryToolbar
        keyword={keyword}
        category={category}
        sort={sort}
        isManageMode={isManageMode}
        onKeywordChange={setKeyword}
        onCategoryChange={setCategory}
        onSortChange={setSort}
        onManageToggle={() => {
          setIsManageMode((current) => !current)
          setSelectedIds([])
        }}
      />

      {isManageMode && (
        <section className={`${styles.card} ${styles.stackSm}`}>
          <p className={styles.bodyText}>{selectedText(t.history.selectedCount, selectedIds.length)}</p>
          <div className={styles.historyActionGrid}>
            <button type="button" className={styles.secondaryButton} onClick={selectAll}>
              {t.history.selectAll}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={clearSelection}>
              {t.history.clearSelection}
            </button>
            {isTrashMode ? (
              <>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={!hasSelection}
                  onClick={() => setConfirmAction({
                    title: t.history.restoreConfirm,
                    description: t.history.restoreDescription,
                    confirmLabel: t.history.restoreSelected,
                    onConfirm: () => restoreSelected(),
                  })}
                >
                  {t.history.restoreSelected}
                </button>
                <button
                  type="button"
                  className={styles.dangerButton}
                  disabled={!hasSelection}
                  onClick={() => setConfirmAction({
                    title: t.history.permanentDeleteConfirm,
                    description: t.history.irreversible,
                    confirmLabel: t.history.permanentDeleteSelected,
                    onConfirm: () => permanentlyDeleteSelected(),
                  })}
                >
                  {t.history.permanentDeleteSelected}
                </button>
              </>
            ) : (
              <button
                type="button"
                className={styles.dangerButton}
                disabled={!hasSelection}
                onClick={() => setConfirmAction({
                  title: t.history.moveToTrashConfirm,
                  description: t.history.moveToTrashDescription,
                  confirmLabel: t.history.moveToTrashSelected,
                  onConfirm: () => moveSelectedToTrash(),
                })}
              >
                {t.history.moveToTrashSelected}
              </button>
            )}
            <button type="button" className={styles.primaryButton} onClick={() => setIsManageMode(false)}>
              {t.history.done}
            </button>
          </div>
        </section>
      )}

      {isTrashMode && items.length > 0 && (
        <section className={`${styles.card} ${styles.stackSm}`}>
          <p className={styles.bodyText}>{t.history.emptyTrashDescription}</p>
          <button
            type="button"
            className={styles.dangerButton}
            onClick={() => setConfirmAction({
              title: t.history.emptyTrashConfirm,
              description: t.history.irreversible,
              confirmLabel: t.history.emptyTrash,
              onConfirm: emptyTrash,
            })}
          >
            {t.history.emptyTrash}
          </button>
        </section>
      )}

      {feedback && <p className={styles.reviewFeedback}>{feedback}</p>}
      {error && <p className={styles.formError}>{error}</p>}

      {!error && items.length === 0 && (
        <EmptyState
          title={isTrashMode ? t.history.emptyTrashTitle : t.history.emptyTitle}
          description={isTrashMode ? t.history.emptyTrashDescription : t.history.emptyDescription}
          actionHref={isTrashMode ? ROUTES.HISTORY : ROUTES.ANALYZE}
          actionLabel={isTrashMode ? t.history.backToHistory : t.history.emptyAction}
        />
      )}

      {!error && items.length > 0 && (
        <div className={styles.recordList}>
          {items.map((item) => (
            <HistoryRecordCard
              key={item.id}
              item={item}
              mode={mode}
              selectable={isManageMode}
              checked={selectedIdSet.has(item.id)}
              onToggle={() => toggleSelected(item.id)}
              onMoveToTrash={() => setConfirmAction({
                title: t.history.moveToTrashConfirm,
                description: t.history.moveToTrashDescription,
                confirmLabel: t.history.moveToTrashRecord,
                onConfirm: () => moveSelectedToTrash([item.id]),
              })}
              onRestore={() => setConfirmAction({
                title: t.history.restoreConfirm,
                description: t.history.restoreDescription,
                confirmLabel: t.history.restoreRecord,
                onConfirm: () => restoreSelected([item.id]),
              })}
              onPermanentDelete={() => setConfirmAction({
                title: t.history.permanentDeleteConfirm,
                description: t.history.irreversible,
                confirmLabel: t.history.permanentDeleteRecord,
                onConfirm: () => permanentlyDeleteSelected([item.id]),
              })}
            />
          ))}
        </div>
      )}

      {confirmAction && (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setConfirmAction(null)}>
          <section
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.stackSm}>
              <h2 id="history-confirm-title" className={styles.titleMd}>{confirmAction.title}</h2>
              <p className={styles.bodyText}>{confirmAction.description}</p>
              <div className={styles.actionRow}>
                <button type="button" className={styles.secondaryButton} onClick={() => setConfirmAction(null)}>
                  {t.common.cancel}
                </button>
                <button type="button" className={styles.dangerButton} onClick={runConfirmed}>
                  {confirmAction.confirmLabel}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

function HistoryToolbar({
  keyword,
  category,
  sort,
  isManageMode,
  onKeywordChange,
  onCategoryChange,
  onSortChange,
  onManageToggle,
}: {
  keyword: string
  category: "all" | HospitalCategory
  sort: AnalysisHistorySort
  isManageMode: boolean
  onKeywordChange: (value: string) => void
  onCategoryChange: (value: "all" | HospitalCategory) => void
  onSortChange: (value: AnalysisHistorySort) => void
  onManageToggle: () => void
}) {
  const { t } = useLanguage()

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <label className={styles.label} htmlFor="history-search-input">
        {t.history.searchHospital}
        <input
          id="history-search-input"
          className={styles.input}
          value={keyword}
          placeholder={t.history.searchHospital}
          onChange={(event) => onKeywordChange(event.target.value)}
        />
      </label>
      <div className={styles.filterGrid}>
        <label className={styles.label}>
          {t.history.category}
          <select className={styles.input} value={category} onChange={(event) => onCategoryChange(event.target.value as "all" | HospitalCategory)}>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? t.history.all : t.categories[option]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.label}>
          {t.history.sort}
          <select className={styles.input} value={sort} onChange={(event) => onSortChange(event.target.value as AnalysisHistorySort)}>
            <option value="latest">{t.history.latestSort}</option>
            <option value="trust">{t.history.trustSort}</option>
            <option value="ad">{t.history.adSort}</option>
          </select>
        </label>
      </div>
      <div className={styles.historyActionGrid}>
        <button type="button" className={styles.secondaryButton} onClick={onManageToggle}>
          {isManageMode ? t.history.cancelManage : t.history.manage}
        </button>
      </div>
    </section>
  )
}

function HistoryRecordCard({
  item,
  mode,
  selectable,
  checked,
  onToggle,
  onMoveToTrash,
  onRestore,
  onPermanentDelete,
}: {
  item: AnalysisHistoryItem
  mode: HistoryMode
  selectable: boolean
  checked: boolean
  onToggle: () => void
  onMoveToTrash: () => void
  onRestore: () => void
  onPermanentDelete: () => void
}) {
  const { t } = useLanguage()
  const trustScore = item.trustScore ?? item.score
  const trustLevel = getTrustLevel(trustScore)
  const trustLevelKey = getTrustLevelKeyFromValue(trustScore, item.trustLevel)
  const adSuspicionLevel = formatSignalLevel(item.adSuspicionLevel, {
    low: t.analyze.low,
    medium: t.analyze.medium,
    high: t.analyze.high,
    caution: t.analyze.caution,
  })
  const date = item.analyzedAt ?? item.createdAt
  const region = item.region || item.hospitalAddress || t.history.regionUnknown
  const isTrashMode = mode === "trash"

  return (
    <article className={`${styles.card} ${styles.stackSm}`}>
      <div className={styles.historyRecordLayout}>
        {selectable && (
          <label className={styles.historyCheckbox}>
            <input type="checkbox" checked={checked} onChange={onToggle} />
          </label>
        )}
        <div className={styles.stackSm}>
          <div className={styles.rowBetween}>
            <div>
              <h3 className={styles.titleMd}>{item.hospitalName}</h3>
              <p className={styles.bodyText}>
                {t.categories[item.category]} · {region}
              </p>
            </div>
            <span className={styles.scoreSmall}>{trustScore}{t.mypage.pointsSuffix}</span>
          </div>
          <div className={styles.badgeRow}>
            <span className={styles.neutralPill}>{date}</span>
            {isTrashMode && item.deletedAt && <span className={styles.neutralPill}>{t.history.deletedAtLabel} {item.deletedAt}</span>}
          </div>
          <div className={styles.metricGrid}>
            <span className={styles.trustMetric}>
              <ShieldCheck className={styles.iconXs} style={{ color: trustLevel.color }} />
              {t.trustLevels[trustLevelKey]}
            </span>
            <span>{t.mypage.adSuspicionLabel} {adSuspicionLevel}</span>
          </div>
          {selectable && (
            <div className={styles.actionRow}>
              {isTrashMode ? (
                <>
                  <button type="button" className={styles.secondaryButton} onClick={onRestore}>
                    <RotateCcw className={styles.iconSm} />
                    {t.history.restoreRecord}
                  </button>
                  <button type="button" className={styles.dangerButton} onClick={onPermanentDelete}>
                    <Trash2 className={styles.iconSm} />
                    {t.history.permanentDeleteRecord}
                  </button>
                </>
              ) : (
                <button type="button" className={styles.dangerButton} onClick={onMoveToTrash}>
                  <Trash2 className={styles.iconSm} />
                  {t.history.moveToTrashRecord}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
