"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { AppShell } from "@/components/common/AppShell"
import { EmptyState } from "@/components/common/EmptyState"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { LoginRequiredCard } from "@/components/common/LoginRequiredCard"
import { INQUIRY_STATUSES, InquiryStatusBadge, formatInquiryDate, inquiryShortDescription } from "@/components/help/InquiryShared"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/lib/routes"
import { ApiClientError, ApiNetworkError } from "@/services/apiClient"
import { inquiryService, type Inquiry, type InquiryStatus } from "@/services/inquiryService"
import styles from "@/styles/App.module.css"

type InquiryStatusFilter = "all" | InquiryStatus
type InquiryErrorState = "none" | "unauthorized" | "forbidden" | "server" | "network"
const PAGE_SIZE = 20

function getInquiryErrorState(error: unknown): InquiryErrorState {
  if (error instanceof ApiNetworkError) return "network"
  if (error instanceof ApiClientError) {
    if (error.status === 401) return "unauthorized"
    if (error.status === 403) return "forbidden"
    return "server"
  }
  return "server"
}

export default function MyInquiriesPage() {
  const { t } = useLanguage()
  const { isAuthenticated, isLoading } = useAuth()
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [statusFilter, setStatusFilter] = useState<InquiryStatusFilter>("all")
  const [isFetching, setIsFetching] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [errorState, setErrorState] = useState<InquiryErrorState>("none")

  const loadData = useCallback(async (nextPage = 1, append = false) => {
    try {
      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsFetching(true)
      }
      setErrorState("none")
      const result = await inquiryService.getMyInquiries({ page: nextPage, perPage: PAGE_SIZE })
      setPage(result.page)
      setTotal(result.total)
      setInquiries((current) => {
        if (!append) return result.items
        const existingIds = new Set(current.map((item) => item.id))
        return [...current, ...result.items.filter((item) => !existingIds.has(item.id))]
      })
    } catch (error) {
      if (!append) setInquiries([])
      setErrorState(getInquiryErrorState(error))
    } finally {
      if (append) {
        setIsLoadingMore(false)
      } else {
        setIsFetching(false)
      }
    }
  }, [])

  useEffect(() => {
    if (isLoading || !isAuthenticated) return
    const timer = window.setTimeout(() => loadData(1, false), 0)
    return () => window.clearTimeout(timer)
  }, [isAuthenticated, isLoading, loadData])

  const visibleInquiries = useMemo(
    () => inquiries.filter((inquiry) => statusFilter === "all" || inquiry.status === statusFilter),
    [inquiries, statusFilter]
  )
  const hasMore = inquiries.length < total

  return (
    <AppShell title={t.help.list.title} showBack>
      {isLoading ? (
        <LoadingSpinner label={t.common.loading} />
      ) : !isAuthenticated ? (
        <LoginRequiredCard
          title={t.help.list.loginRequiredTitle}
          description={t.help.list.loginRequiredDescription}
          showSignup={false}
          secondaryHref={ROUTES.HELP}
          secondaryLabel={t.help.title}
          primaryLabel={t.help.list.loginAction}
        />
      ) : (
        <div className={`${styles.stackMd} ${styles.helpPageStack}`}>
          <section className={`${styles.card} ${styles.stackSm}`}>
            <h1 className={styles.titleLg}>{t.help.list.title}</h1>
            <p className={styles.bodyText}>{t.help.list.description}</p>
          </section>

          {isFetching && <LoadingSpinner label={t.help.list.loading} />}
          {errorState !== "none" && (
            <section className={styles.inquiryErrorCard}>
              <strong>{t.help.list.errorMessages[errorState]}</strong>
              {errorState === "unauthorized" && (
                <Link href={ROUTES.LOGIN} className={styles.secondaryButton}>
                  {t.help.list.loginAction}
                </Link>
              )}
            </section>
          )}

          {!isFetching && errorState === "none" && inquiries.length > 0 && (
            <div className={styles.helpFilterTabs} role="tablist" aria-label={t.help.list.statusFilterLabel}>
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === "all"}
                className={`${styles.helpFilterTab} ${statusFilter === "all" ? styles.helpFilterTabActive : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                {t.help.list.allStatuses}
              </button>
              {INQUIRY_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === status}
                  className={`${styles.helpFilterTab} ${statusFilter === status ? styles.helpFilterTabActive : ""}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {t.help.status[status]}
                </button>
              ))}
            </div>
          )}

          {!isFetching && errorState === "none" && inquiries.length === 0 && (
            <EmptyState
              title={t.help.list.emptyTitle}
              description={t.help.list.emptyDescription}
              actionHref={ROUTES.HELP_NEW}
              actionLabel={t.help.list.emptyAction}
            />
          )}

          {!isFetching && errorState === "none" && inquiries.length > 0 && visibleInquiries.length === 0 && (
            <>
              <EmptyState
                title={t.help.list.filterEmptyTitle}
                description={t.help.list.filterEmptyDescription}
                actionHref={ROUTES.HELP_NEW}
                actionLabel={t.help.list.emptyAction}
              />
              {hasMore && (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={isLoadingMore}
                  onClick={() => loadData(page + 1, true)}
                >
                  {isLoadingMore ? t.help.list.loading : t.help.list.loadMore}
                </button>
              )}
            </>
          )}

          {!isFetching && errorState === "none" && visibleInquiries.length > 0 && (
            <section className={styles.stackSm}>
              {visibleInquiries.map((inquiry) => (
                <Link key={inquiry.id} href={`${ROUTES.HELP}/${inquiry.id}`} className={styles.inquiryListCard}>
                  <div className={styles.rowBetween}>
                    <InquiryStatusBadge status={inquiry.status} label={t.help.status[inquiry.status]} />
                    <ChevronRight className={styles.iconSm} />
                  </div>
                  <strong>{inquiry.title}</strong>
                  <span>{t.help.categories[inquiry.category]} · {formatInquiryDate(inquiry.createdAt)}</span>
                  <p>{inquiryShortDescription(inquiry, t.help.statusDescriptions)}</p>
                </Link>
              ))}
              {hasMore && (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={isLoadingMore}
                  onClick={() => loadData(page + 1, true)}
                >
                  {isLoadingMore ? t.help.list.loading : t.help.list.loadMore}
                </button>
              )}
            </section>
          )}
        </div>
      )}
    </AppShell>
  )
}
