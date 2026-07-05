"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  FileText,
  History,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import type { NotificationItem, NotificationType } from "@/lib/types"
import { notificationService } from "@/services/notificationService"
import styles from "@/styles/App.module.css"

type NotificationFilter = "all" | "analysis" | "review" | "account"

const filters: NotificationFilter[] = ["all", "analysis", "review", "account"]

const analysisTypes: NotificationType[] = [
  "analysis_done",
  "analysis_saved",
  "suspicious_review",
  "trust_score_changed",
]
const reviewTypes: NotificationType[] = [
  "review_requested",
  "review_in_progress",
  "review_resolved",
  "info_updated",
]

function notificationGroup(type: NotificationType): NotificationFilter | "system" {
  if (analysisTypes.includes(type)) return "analysis"
  if (reviewTypes.includes(type)) return "review"
  if (type === "security") return "account"
  return "system"
}

function notificationTone(type: NotificationType) {
  if (type === "suspicious_review") return styles.notificationTonePink
  if (type === "trust_score_changed" || type === "analysis_saved" || type === "info_updated") {
    return styles.notificationToneMint
  }
  if (reviewTypes.includes(type)) return styles.notificationTonePeach
  if (type === "security") return styles.notificationToneLavender
  if (type === "system") return styles.notificationToneNeutral
  return styles.notificationToneLavender
}

function NotificationIcon({ type }: { type: NotificationType }) {
  const iconClass = styles.iconSm

  if (type === "suspicious_review") return <AlertTriangle className={iconClass} />
  if (type === "analysis_saved") return <History className={iconClass} />
  if (type === "trust_score_changed") return <CheckCheck className={iconClass} />
  if (reviewTypes.includes(type)) return <ClipboardCheck className={iconClass} />
  if (type === "security") return <ShieldCheck className={iconClass} />
  if (type === "system") return <Bell className={iconClass} />
  return <Sparkles className={iconClass} />
}

interface NotificationBottomSheetProps {
  open: boolean
  items: NotificationItem[]
  total?: number
  isLoadingMore?: boolean
  onItemsChange: (items: NotificationItem[]) => void
  onLoadMore?: () => Promise<void> | void
  onUnreadCountChange?: (next: number | ((current: number) => number)) => void
  onClose: () => void
}

export function NotificationBottomSheet({
  open,
  items,
  total = items.length,
  isLoadingMore = false,
  onItemsChange,
  onLoadMore,
  onUnreadCountChange,
  onClose,
}: NotificationBottomSheetProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all")

  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items])
  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items
    return items.filter((item) => notificationGroup(item.type) === activeFilter)
  }, [activeFilter, items])

  const summaryCounts = useMemo(
    () => ({
      analysis: items.filter((item) => notificationGroup(item.type) === "analysis").length,
      review: items.filter((item) => notificationGroup(item.type) === "review").length,
      security: items.filter((item) => notificationGroup(item.type) === "account").length,
    }),
    [items]
  )

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return
    await notificationService.markAllAsRead()
    onItemsChange(items.map((item) => ({ ...item, isRead: true })))
    onUnreadCountChange?.(0)
  }

  const handleNavigate = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await notificationService.markAsRead(item.id)
        onItemsChange(items.map((nextItem) => (
          nextItem.id === item.id ? { ...nextItem, isRead: true } : nextItem
        )))
        onUnreadCountChange?.((current) => Math.max(0, current - 1))
      } catch {
        // Navigation is still useful even if marking as read fails.
      }
    }
    onClose()
    router.push(item.link!)
  }

  const handleRouteNavigate = (href: string) => {
    onClose()
    router.push(href)
  }

  return (
    <div className={`${styles.modalBackdrop} ${styles.notificationSheetBackdrop}`} onClick={onClose}>
      <section
        className={styles.notificationSheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <span className={styles.sheetHandle} aria-hidden="true" />

        <div className={styles.notificationSheetHeader}>
          <div>
            <h2 id="notification-sheet-title" className={styles.notificationSheetTitle}>
              <Sparkles className={styles.iconSm} />
              {t.notificationCenter.title}
            </h2>
            <p className={styles.notificationSheetDescription}>{t.notificationCenter.headerDescription}</p>
          </div>
          <div className={styles.notificationSheetActions}>
            <button type="button" className={styles.notificationMarkReadButton} onClick={handleMarkAllAsRead}>
              {t.notificationCenter.markAllRead}
            </button>
            <button type="button" className={styles.notificationCloseButton} aria-label={t.common.close} onClick={onClose}>
              <X className={styles.iconMd} />
            </button>
          </div>
        </div>

        <section className={styles.notificationSummaryCard}>
          <div className={styles.notificationSummaryContent}>
            <div>
              <p className={styles.memberEyebrow}>{t.notificationCenter.todayTitle}</p>
              <p className={styles.mutedText}>{t.notificationCenter.todayDescription}</p>
            </div>
            <div className={styles.notificationSummaryRow}>
              <div className={styles.notificationSummaryGrid}>
                <span className={`${styles.notificationSummaryChip} ${styles.notificationSummaryAnalysis}`}>
                  <BarChart3 className={styles.iconSm} />
                  <strong>{summaryCounts.analysis}</strong>
                  <span className={styles.notificationSummaryLabel}>{t.notificationCenter.summary.analysis}</span>
                </span>
                <span className={`${styles.notificationSummaryChip} ${styles.notificationSummaryReview}`}>
                  <ClipboardCheck className={styles.iconSm} />
                  <strong>{summaryCounts.review}</strong>
                  <span className={styles.notificationSummaryLabel}>{t.notificationCenter.summary.review}</span>
                </span>
                <span className={`${styles.notificationSummaryChip} ${styles.notificationSummarySecurity}`}>
                  <ShieldCheck className={styles.iconSm} />
                  <strong>{summaryCounts.security}</strong>
                  <span className={styles.notificationSummaryLabel}>{t.notificationCenter.summary.security}</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.notificationTabs} role="tablist" aria-label={t.notificationCenter.title}>
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={activeFilter === filter}
              className={activeFilter === filter ? styles.notificationTabActive : ""}
              onClick={() => setActiveFilter(filter)}
            >
              {t.notificationCenter.tabs[filter]}
            </button>
          ))}
        </div>

        <div className={styles.notificationSheetBody}>
          {filteredItems.length > 0 ? (
            <div className={styles.notificationList}>
              {filteredItems.map((item) => (
                <NotificationSheetCard key={item.id} item={item} onNavigate={handleNavigate} />
              ))}
            </div>
          ) : (
            <section className={styles.notificationEmptyState}>
              <span className={styles.notificationEmptyIcon} aria-hidden="true">
                <ShieldCheck className={styles.iconMd} />
              </span>
              <h3>{t.notificationCenter.empty[activeFilter].title}</h3>
              <p>{t.notificationCenter.empty[activeFilter].description}</p>
            </section>
          )}
        </div>

        <div className={styles.notificationSheetFooter}>
          {onLoadMore && items.length < total && (
            <button
              type="button"
              className={`${styles.secondaryButton} ${styles.notificationFooterButton} ${styles.notificationFooterGlass}`}
              disabled={isLoadingMore}
              onClick={onLoadMore}
            >
              {isLoadingMore ? t.common.loading : t.common.more}
            </button>
          )}
          <button
            type="button"
            className={`${styles.secondaryButton} ${styles.notificationFooterButton} ${styles.notificationFooterGlass}`}
            onClick={() => handleRouteNavigate(ROUTES.MYPAGE_HISTORY)}
          >
            <FileText className={styles.iconSm} />
            {t.notificationCenter.actions.viewHistory}
          </button>
          <button
            type="button"
            className={`${styles.primaryButton} ${styles.notificationFooterButton} ${styles.notificationFooterPrimary}`}
            onClick={() => handleRouteNavigate(ROUTES.MYPAGE_SETTINGS)}
          >
            <Settings className={styles.iconSm} />
            {t.notificationCenter.actions.settings}
          </button>
        </div>
      </section>
    </div>
  )
}

function NotificationSheetCard({
  item,
  onNavigate,
}: {
  item: NotificationItem
  onNavigate: (item: NotificationItem) => void
}) {
  const { t } = useLanguage()
  const template = t.notificationCenter.cardTemplates[item.type] ?? t.notificationCenter.cardTemplates.system
  const title = item.title || template.title
  const message = item.message || template.message
  const actionLabel = item.actionLabel || template.action
  const cardContent = (
    <>
      <span className={styles.notificationCardUnreadSlot}>
        {!item.isRead && <span className={styles.unreadDot} />}
      </span>
      <span className={`${styles.notificationCardIcon} ${notificationTone(item.type)}`}>
        <NotificationIcon type={item.type} />
      </span>
      <span className={styles.notificationCardBody}>
        <span className={styles.notificationCardTitle}>{title}</span>
        <span className={styles.notificationCardMessage}>{message}</span>
        <span className={styles.notificationCardMeta}>
          {item.createdAt}
          {actionLabel && <strong className={styles.notificationActionPill}>{actionLabel}</strong>}
        </span>
      </span>
      <ChevronRight className={styles.notificationChevron} />
    </>
  )

  if (!item.link) {
    return <article className={styles.notificationCard}>{cardContent}</article>
  }

  return (
    <button type="button" className={styles.notificationCard} onClick={() => onNavigate(item)}>
      {cardContent}
    </button>
  )
}
