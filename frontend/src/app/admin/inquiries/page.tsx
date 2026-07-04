"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import {
  INQUIRY_CATEGORIES,
  INQUIRY_STATUSES,
  InquiryRelatedAnalysisCard,
  InquiryStatusBadge,
  formatInquiryDate,
} from "@/components/help/InquiryShared"
import { useLanguage } from "@/context/LanguageContext"
import {
  inquiryService,
  type Inquiry,
  type InquiryCategory,
  type InquiryFilters,
  type InquiryStatus,
} from "@/services/inquiryService"
import styles from "@/styles/App.module.css"

const PAGE_SIZE = 20

export default function AdminInquiriesPage() {
  const { t } = useLanguage()
  const [filters, setFilters] = useState<InquiryFilters>({ status: "all", category: "all" })
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [answerDrafts, setAnswerDrafts] = useState<Record<number, string>>({})

  const selectedInquiry = useMemo(
    () => inquiries.find((inquiry) => inquiry.id === selectedId) ?? inquiries[0] ?? null,
    [inquiries, selectedId],
  )
  const answerContent = selectedInquiry
    ? answerDrafts[selectedInquiry.id] ?? selectedInquiry.answer?.content ?? ""
    : ""

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")
      const result = await inquiryService.getAdminInquiries({ ...filters, page, perPage: PAGE_SIZE })
      setInquiries(result.items)
      setTotal(result.total)
      setSelectedId((current) => {
        if (current && result.items.some((item) => item.id === current)) return current
        return result.items[0]?.id ?? null
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : t.help.admin.loadFailed)
    } finally {
      setIsLoading(false)
    }
  }, [filters, page, t.help.admin.loadFailed])

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0)
    return () => window.clearTimeout(timer)
  }, [loadData])

  const updateFilters = (nextFilters: InquiryFilters) => {
    setFilters(nextFilters)
    setPage(1)
  }

  const replaceInquiry = (nextInquiry: Inquiry) => {
    setInquiries((current) => current.map((item) => (item.id === nextInquiry.id ? nextInquiry : item)))
    setSelectedId(nextInquiry.id)
  }

  const handleStatusChange = async (status: InquiryStatus) => {
    if (!selectedInquiry) return
    try {
      setIsSaving(true)
      setError("")
      const nextInquiry = await inquiryService.updateAdminStatus(selectedInquiry.id, status)
      replaceInquiry(nextInquiry)
    } catch (error) {
      setError(error instanceof Error ? error.message : t.help.admin.saveFailed)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAnswer = async () => {
    if (!selectedInquiry || !answerContent.trim()) return
    try {
      setIsSaving(true)
      setError("")
      const nextInquiry = await inquiryService.saveAdminAnswer(selectedInquiry.id, answerContent.trim())
      replaceInquiry(nextInquiry)
      setAnswerDrafts((current) => {
        const next = { ...current }
        delete next[selectedInquiry.id]
        return next
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : t.help.admin.saveFailed)
    } finally {
      setIsSaving(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <AdminAppShell title={t.help.admin.title}>
      <AdminGuard>
        <section className="page-title">
          <p className="eyebrow">{t.help.admin.eyebrow}</p>
          <h1>{t.help.admin.title}</h1>
          <p>{t.help.admin.description}</p>
        </section>

        <section className="soft-card admin-table-card">
          <div className="admin-filter-grid">
            <input
              value={filters.keyword ?? ""}
              placeholder={t.help.admin.searchPlaceholder}
              onChange={(event) => updateFilters({ ...filters, keyword: event.target.value })}
            />
            <select
              value={filters.status ?? "all"}
              onChange={(event) => updateFilters({ ...filters, status: event.target.value as InquiryFilters["status"] })}
            >
              <option value="all">{t.help.admin.allStatuses}</option>
              {INQUIRY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t.help.status[status]}
                </option>
              ))}
            </select>
            <select
              value={filters.category ?? "all"}
              onChange={(event) => updateFilters({ ...filters, category: event.target.value as "all" | InquiryCategory })}
            >
              <option value="all">{t.help.admin.allCategories}</option>
              {INQUIRY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {t.help.categories[category]}
                </option>
              ))}
            </select>
          </div>
        </section>

        {isLoading && <p>{t.admin.loading}</p>}
        {error && <p className="form-error">{error}</p>}

        {!isLoading && (
          <section className={styles.adminInquiryLayout}>
            <div className={`${styles.card} ${styles.stackSm}`}>
              <div className={styles.rowBetween}>
                <h2 className={styles.titleMd}>{t.help.admin.listTitle}</h2>
                <span className={styles.mutedText}>{total}</span>
              </div>
              {inquiries.length === 0 ? (
                <p className={styles.mutedText}>{t.help.admin.empty}</p>
              ) : (
                <div className={styles.adminInquiryList}>
                  {inquiries.map((inquiry) => (
                    <button
                      key={inquiry.id}
                      type="button"
                      className={`${styles.adminInquiryItem} ${selectedInquiry?.id === inquiry.id ? styles.adminInquiryItemActive : ""}`}
                      onClick={() => setSelectedId(inquiry.id)}
                    >
                      <InquiryStatusBadge status={inquiry.status} label={t.help.status[inquiry.status]} />
                      <strong>{inquiry.title}</strong>
                      <span>{t.help.categories[inquiry.category]} · {formatInquiryDate(inquiry.createdAt)}</span>
                      <small>{inquiry.member?.nickname || inquiry.member?.email || "-"}</small>
                    </button>
                  ))}
                </div>
              )}

              {total > PAGE_SIZE && (
                <div className="admin-pagination-controls">
                  <button
                    type="button"
                    className="admin-pagination-button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    {t.common.previous}
                  </button>
                  <span className="admin-pagination-info">{page} / {totalPages}</span>
                  <button
                    type="button"
                    className="admin-pagination-button admin-pagination-button-primary"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  >
                    {t.common.next}
                  </button>
                </div>
              )}
            </div>

            <div className={`${styles.card} ${styles.stackMd}`}>
              {!selectedInquiry ? (
                <p className={styles.mutedText}>{t.help.admin.selectFirst}</p>
              ) : (
                <>
                  <div className={styles.stackSm}>
                    <InquiryStatusBadge status={selectedInquiry.status} label={t.help.status[selectedInquiry.status]} />
                    <h2 className={styles.titleLg}>{selectedInquiry.title}</h2>
                    <p className={styles.bodyText}>{selectedInquiry.content}</p>
                  </div>

                  <div className={styles.inquiryDetailMeta}>
                    <span>{t.help.detail.category}: {t.help.categories[selectedInquiry.category]}</span>
                    {selectedInquiry.subCategory && <span>{t.help.detail.subCategory}: {selectedInquiry.subCategory}</span>}
                    <span>{t.help.admin.writer}: {selectedInquiry.member?.nickname || selectedInquiry.member?.email || "-"}</span>
                    <span>{t.help.detail.createdAt}: {formatInquiryDate(selectedInquiry.createdAt)}</span>
                  </div>

                  {selectedInquiry.relatedAnalysis && (
                    <InquiryRelatedAnalysisCard
                      analysis={selectedInquiry.relatedAnalysis}
                      title={t.help.detail.relatedAnalysisTitle}
                      totalScoreLabel={t.help.detail.totalScore}
                      variant="panel"
                    />
                  )}

                  {selectedInquiry.attachmentUrl && (
                    <a className={styles.secondaryButton} href={selectedInquiry.attachmentUrl} target="_blank" rel="noreferrer">
                      {t.help.detail.attachmentTitle}
                    </a>
                  )}

                  <label className={styles.label}>
                    {t.help.admin.statusChange}
                    <select
                      className={styles.input}
                      value={selectedInquiry.status}
                      disabled={isSaving}
                      onChange={(event) => handleStatusChange(event.target.value as InquiryStatus)}
                    >
                      {INQUIRY_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {t.help.status[status]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.label}>
                    {t.help.admin.answer}
                    <textarea
                      className={styles.textarea}
                      value={answerContent}
                      placeholder={t.help.admin.answerPlaceholder}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        setAnswerDrafts((current) => ({
                          ...current,
                          [selectedInquiry.id]: nextValue,
                        }))
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={isSaving || !answerContent.trim()}
                    onClick={handleSaveAnswer}
                  >
                    {isSaving ? t.help.admin.saving : t.help.admin.saveAnswer}
                  </button>
                </>
              )}
            </div>
          </section>
        )}
      </AdminGuard>
    </AdminAppShell>
  )
}
