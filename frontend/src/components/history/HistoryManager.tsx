"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, ArchiveRestore, CheckSquare2, ChevronRight, MessageCircle, RotateCcw, Settings2, ShieldCheck, Trash2, X } from "lucide-react"
import { EmptyState } from "@/components/common/EmptyState"
import { LoginRequiredCard } from "@/components/common/LoginRequiredCard"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/context/LanguageContext"
import { writeCurrentReviewAnalysisFromHistory } from "@/lib/analysisStorage"
import {
  buildAnalysisChatbotHref,
  buildChatbotContextFromAnalysis,
  getAnalysisResultId,
  writeSelectedChatbotAnalysisContext,
} from "@/lib/chatbotContext"
import { formatDisplayDate } from "@/lib/dateFormat"
import { ROUTES } from "@/lib/routes"
import { formatSignalLevel, getTrustLevel, getTrustLevelKeyFromValue } from "@/lib/score"
import type { AnalysisHistoryItem, HospitalCategory } from "@/lib/types"
import {
  analysisHistoryService,
  filterAndSortAnalysisHistory,
  type AnalysisHistorySort,
} from "@/services/analysisHistoryService"
import styles from "@/styles/App.module.css"

type HistoryMode = "active" | "trash"

type ConfirmAction = {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => Promise<void> | void
}

const categoryOptions: Array<"all" | HospitalCategory> = ["all", "derma", "eye", "dental"]
const PAGE_SIZE = 5

function selectedText(template: string, count: number) {
  return template.replace("{count}", String(count))
}

export function HistoryManager({ mode = "active" }: { mode?: HistoryMode }) {
  const { t } = useLanguage()
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const isTrashMode = mode === "trash"
  const [searchInput, setSearchInput] = useState("")
  const [appliedSearchKeyword, setAppliedSearchKeyword] = useState("")
  const [category, setCategory] = useState<"all" | HospitalCategory>("all")
  const [sort, setSort] = useState<AnalysisHistorySort>("latest")
  const [histories, setHistories] = useState<AnalysisHistoryItem[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isManageMode, setIsManageMode] = useState(isTrashMode)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [feedback, setFeedback] = useState("")
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isManagementPanelOpen, setIsManagementPanelOpen] = useState(false)

  const filteredHistories = useMemo(() => (
    filterAndSortAnalysisHistory(histories, { keyword: appliedSearchKeyword, category, sort })
  ), [appliedSearchKeyword, category, histories, sort])
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const hasSelection = selectedIds.length > 0
  const totalPages = Math.max(1, Math.ceil(filteredHistories.length / PAGE_SIZE))
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages))
  const visibleItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE
    return filteredHistories.slice(start, start + PAGE_SIZE)
  }, [filteredHistories, safeCurrentPage])
  const searchInputLength = searchInput.trim().length
  const isShortSearchInput = searchInputLength === 1
  const isFilteredView = appliedSearchKeyword.trim().length >= 2 || category !== "all"
  const recordCountLabel = selectedText(
    isFilteredView ? t.history.searchResultCount : t.history.recordCount,
    filteredHistories.length
  )

  const loadItems = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError("")
      const nextItems = isTrashMode
        ? await analysisHistoryService.getTrashHistory(user?.id)
        : await analysisHistoryService.getAnalysisHistory(user?.id)
      setHistories(nextItems)
      setSelectedIds((current) => current.filter((id) => nextItems.some((item) => item.id === id)))
    } catch (error) {
      setError(error instanceof Error ? error.message : t.history.loadFailed)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, isTrashMode, t.history.loadFailed, user])

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

  const selectAll = () => setSelectedIds(filteredHistories.map((item) => item.id))
  const clearSelection = () => setSelectedIds([])

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
    setSort("latest")
    setSelectedIds([])
    setCurrentPage(1)
  }

  const runConfirmed = async () => {
    if (!confirmAction) return
    await confirmAction.onConfirm()
    setConfirmAction(null)
  }

  const afterAction = async (message: string) => {
    setFeedback(message)
    setSelectedIds([])
    setIsManageMode(false)
    setIsManagementPanelOpen(false)
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

  const moveAllToTrash = async () => {
    const allItems = await analysisHistoryService.getAnalysisHistory(user?.id)
    await analysisHistoryService.moveAnalysisHistoryToTrash(user?.id, allItems.map((item) => item.id))
    await afterAction(t.history.moveToTrashDone)
  }

  useEffect(() => {
    if (currentPage <= totalPages) return
    const timer = window.setTimeout(() => {
      setCurrentPage(totalPages)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [currentPage, totalPages])

  useEffect(() => {
    if (!isManagementPanelOpen && !confirmAction) return

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      if (confirmAction) {
        setConfirmAction(null)
        return
      }
      setIsManagementPanelOpen(false)
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [confirmAction, isManagementPanelOpen])

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
        <p className={styles.memberEyebrow}>{isTrashMode ? "DELETED" : "HISTORY"}</p>
        <h2 className={styles.titleMd}>{isTrashMode ? t.history.trashTitle : t.history.title}</h2>
        <p className={styles.bodyText}>{isTrashMode ? t.history.trashDescription : t.history.description}</p>
        <div className={styles.actionRow}>
          {isTrashMode && (
            <Link className={styles.secondaryButton} href={ROUTES.HISTORY}>
              {t.history.backToHistory}
            </Link>
          )}
        </div>
      </section>

      <HistoryToolbar
        searchInput={searchInput}
        category={category}
        sort={sort}
        isManageMode={isManageMode}
        isTrashMode={isTrashMode}
        onSearchInputChange={applySearchInput}
        onCategoryChange={(value) => {
          setCategory(value)
          setCurrentPage(1)
        }}
        onResetSearch={resetSearchAndFilters}
        onSortChange={(value) => {
          setSort(value)
          setCurrentPage(1)
        }}
        onManageToggle={() => {
          setIsManageMode((current) => !current)
          setSelectedIds([])
        }}
        onOpenManagementPanel={() => setIsManagementPanelOpen(true)}
      />

      {isManagementPanelOpen && !isTrashMode && (
        <div className={styles.historyModalBackdrop} role="presentation" onClick={() => setIsManagementPanelOpen(false)}>
          <section
            className={`${styles.historyManagementModal} ${styles.stackMd}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-management-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.historyModalHeader}>
              <span className={`${styles.historyModalIcon} ${styles.historyModalIconLavender}`}>
                <Settings2 className={styles.iconSm} />
              </span>
              <h2 id="history-management-title" className={styles.titleMd}>{t.history.manageRecords}</h2>
            </div>
            <div className={styles.historyManagementActions}>
              <Link className={styles.historyManagementItem} href={ROUTES.HISTORY_TRASH}>
                <span className={`${styles.historyManagementItemIcon} ${styles.historyModalIconLavender}`}>
                  <ArchiveRestore className={styles.iconSm} />
                </span>
                <span className={styles.historyManagementItemText}>
                  <strong>{t.history.viewDeletedRecords}</strong>
                  <small>{t.history.viewDeletedRecordsDescription}</small>
                </span>
                <ChevronRight className={styles.iconSm} />
              </Link>
              <button
                type="button"
                className={styles.historyManagementItem}
                onClick={() => {
                  setSelectedIds([])
                  setIsManageMode(true)
                  setIsManagementPanelOpen(false)
                }}
              >
                <span className={`${styles.historyManagementItemIcon} ${styles.historyModalIconMint}`}>
                  <CheckSquare2 className={styles.iconSm} />
                </span>
                <span className={styles.historyManagementItemText}>
                  <strong>{t.history.selectionModeTitle}</strong>
                  <small>{t.history.selectionModeDescription}</small>
                </span>
                <ChevronRight className={styles.iconSm} />
              </button>
              <button
                type="button"
                className={styles.historyManagementItem}
                disabled={histories.length === 0}
                onClick={() => {
                  setIsManagementPanelOpen(false)
                  setConfirmAction({
                    title: t.history.deleteAllRecordsConfirmTitle,
                    description: t.history.deleteAllRecordsConfirmDescription,
                    confirmLabel: t.history.deleteAllRecordsConfirmAction,
                    onConfirm: moveAllToTrash,
                  })
                }}
              >
                <span className={`${styles.historyManagementItemIcon} ${styles.historyModalIconPink}`}>
                  <Trash2 className={styles.iconSm} />
                </span>
                <span className={styles.historyManagementItemText}>
                  <strong>{t.history.deleteAllRecords}</strong>
                  <small>{t.history.deleteAllRecordsDescription}</small>
                </span>
                <ChevronRight className={styles.iconSm} />
              </button>
              <button type="button" className={styles.historyModalCloseButton} onClick={() => setIsManagementPanelOpen(false)}>
                {t.common.close}
              </button>
            </div>
          </section>
        </div>
      )}

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

      {isTrashMode && histories.length > 0 && (
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

      {!error && histories.length === 0 && (
        <EmptyState
          title={isTrashMode ? t.history.emptyTrashTitle : t.history.emptyTitle}
          description={isTrashMode ? t.history.emptyTrashDescription : t.history.emptyDescription}
          actionHref={isTrashMode ? ROUTES.HISTORY : ROUTES.ANALYZE}
          actionLabel={isTrashMode ? t.history.backToHistory : t.history.emptyAction}
        />
      )}

      {!error && histories.length > 0 && filteredHistories.length === 0 && (
        <section className={`${styles.emptyCard} ${styles.stackSm}`}>
          <h2 className={styles.titleMd}>{t.history.searchEmptyTitle}</h2>
          <p className={styles.mutedText}>{t.history.searchEmptyDescription}</p>
          <button type="button" className={styles.primaryButton} onClick={resetSearchAndFilters}>
            {t.history.resetSearch}
          </button>
        </section>
      )}

      {!error && histories.length > 0 && filteredHistories.length > 0 && (
        <>
          <div className={styles.historyCountRow}>
            <p className={styles.mutedText}>{recordCountLabel}</p>
            {isShortSearchInput && <p className={styles.searchHint}>{t.history.searchMinLengthHint}</p>}
          </div>
          <div className={styles.recordList}>
            {visibleItems.map((item) => (
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

      {confirmAction && (
        <div className={styles.historyModalBackdrop} role="presentation" onClick={() => setConfirmAction(null)}>
          <section
            className={`${styles.historyConfirmModal} ${styles.stackSm}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <span className={`${styles.historyModalIcon} ${styles.historyModalIconPeach}`}>
              <AlertTriangle className={styles.iconSm} />
            </span>
            <h2 id="history-confirm-title" className={styles.titleMd}>{confirmAction.title}</h2>
            <p className={styles.bodyText}>{confirmAction.description}</p>
            <div className={styles.actionRow}>
              <button type="button" className={styles.secondaryButton} onClick={() => setConfirmAction(null)}>
                {t.common.cancel}
              </button>
              <button type="button" className={styles.historyConfirmDeleteButton} onClick={runConfirmed}>
                {confirmAction.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

function HistoryToolbar({
  searchInput,
  category,
  sort,
  isManageMode,
  isTrashMode,
  onSearchInputChange,
  onCategoryChange,
  onSortChange,
  onManageToggle,
  onOpenManagementPanel,
  onResetSearch,
}: {
  searchInput: string
  category: "all" | HospitalCategory
  sort: AnalysisHistorySort
  isManageMode: boolean
  isTrashMode: boolean
  onSearchInputChange: (value: string, isComposing?: boolean) => void
  onCategoryChange: (value: "all" | HospitalCategory) => void
  onSortChange: (value: AnalysisHistorySort) => void
  onManageToggle: () => void
  onOpenManagementPanel: () => void
  onResetSearch: () => void
}) {
  const { t } = useLanguage()

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <label className={styles.label} htmlFor="history-search-input">
        {t.history.searchHospital}
        <span className={styles.searchInputField}>
          <input
            id="history-search-input"
            className={styles.input}
            value={searchInput}
            placeholder={t.history.searchHospital}
            onChange={(event) => {
              if ((event.nativeEvent as InputEvent).isComposing) {
                onSearchInputChange(event.target.value, true)
                return
              }
              onSearchInputChange(event.target.value)
            }}
            onCompositionEnd={(event) => onSearchInputChange(event.currentTarget.value)}
          />
          {searchInput && (
            <button type="button" className={styles.searchClearButton} aria-label={t.history.resetSearch} onClick={onResetSearch}>
              <X className={styles.iconXs} />
            </button>
          )}
        </span>
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
      {!isTrashMode && (
        <div className={styles.historyManageButtonWrap}>
          <button type="button" className={styles.historyManageButton} onClick={onOpenManagementPanel}>
            <Settings2 className={styles.iconSm} />
            {t.history.manageRecords}
          </button>
        </div>
      )}
      {isTrashMode && (
        <button type="button" className={styles.secondaryButton} onClick={onManageToggle}>
          {isManageMode ? t.history.cancelManage : t.history.manage}
        </button>
      )}
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
  const router = useRouter()
  const { t, language } = useLanguage()
  const trustScore = item.trustScore ?? item.score
  const trustLevel = getTrustLevel(trustScore)
  const trustLevelKey = getTrustLevelKeyFromValue(trustScore, item.trustLevel)
  const adSuspicionLevel = formatSignalLevel(item.adSuspicionLevel, {
    low: t.analyze.low,
    medium: t.analyze.medium,
    high: t.analyze.high,
    caution: t.analyze.caution,
  })
  const date = formatDisplayDate(item.analyzedAt ?? item.createdAt, language)
  const deletedAt = formatDisplayDate(item.deletedAt, language)
  const region = item.region || item.hospitalAddress || t.history.regionUnknown
  const isTrashMode = mode === "trash"
  const askWithResult = () => {
    const analysisResultId = getAnalysisResultId(item)
    if (analysisResultId) {
      router.push(buildAnalysisChatbotHref(analysisResultId))
      return
    }
    writeSelectedChatbotAnalysisContext(buildChatbotContextFromAnalysis(item))
    router.push(ROUTES.CHATBOT)
  }
  const viewResult = () => {
    writeCurrentReviewAnalysisFromHistory(item)
  }

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
            {isTrashMode && deletedAt && <span className={styles.neutralPill}>{t.history.deletedAtLabel} {deletedAt}</span>}
          </div>
          <div className={styles.metricGrid}>
            <span className={styles.trustMetric}>
              <ShieldCheck className={styles.iconXs} style={{ color: trustLevel.color }} />
              {t.trustLevels[trustLevelKey]}
            </span>
            <span>{t.mypage.adSuspicionLabel} {adSuspicionLevel}</span>
          </div>
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
              <>
                <Link href={ROUTES.RESULT} className={styles.secondaryButton} onClick={viewResult}>
                  {t.history.viewDetails}
                </Link>
                <button type="button" className={styles.secondaryButton} onClick={askWithResult}>
                  <MessageCircle className={styles.iconSm} />
                  {t.chatbot.askWithResult}
                </button>
                <button type="button" className={styles.dangerButton} onClick={onMoveToTrash}>
                  <Trash2 className={styles.iconSm} />
                  {t.history.deleteRecord}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
