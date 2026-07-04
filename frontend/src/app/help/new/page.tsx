"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ImagePlus, MessageCircle } from "lucide-react"
import { AppShell } from "@/components/common/AppShell"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { LoginRequiredCard } from "@/components/common/LoginRequiredCard"
import { INQUIRY_CATEGORIES, formatInquiryDate } from "@/components/help/InquiryShared"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/lib/routes"
import type { AnalysisHistoryItem } from "@/lib/types"
import { analysisHistoryService } from "@/services/analysisHistoryService"
import { inquiryService, type InquiryCategory } from "@/services/inquiryService"
import styles from "@/styles/App.module.css"

function getInitialCategory(value: string | null): InquiryCategory {
  return INQUIRY_CATEGORIES.includes(value as InquiryCategory) ? (value as InquiryCategory) : "ANALYSIS_RESULT"
}

function getInitialRelatedAnalysisId(value: string | null) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export default function NewInquiryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const { user, isAuthenticated, isLoading } = useAuth()
  const [category, setCategory] = useState<InquiryCategory>(() => getInitialCategory(searchParams.get("category")))
  const [subCategory, setSubCategory] = useState("")
  const [title, setTitle] = useState(() => searchParams.get("title")?.trim() ?? "")
  const [content, setContent] = useState("")
  const [relatedAnalysisId, setRelatedAnalysisId] = useState<number | null>(() => getInitialRelatedAnalysisId(searchParams.get("related_analysis_id")))
  const [records, setRecords] = useState<AnalysisHistoryItem[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [attachmentNotice, setAttachmentNotice] = useState(false)

  const subcategories = useMemo(() => t.help.subcategories[category] ?? [], [category, t.help.subcategories])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextCategory = getInitialCategory(searchParams.get("category"))
      setCategory(nextCategory)
      const nextTitle = searchParams.get("title")?.trim()
      if (nextTitle) setTitle((current) => current || nextTitle)
      const nextRelatedAnalysisId = getInitialRelatedAnalysisId(searchParams.get("related_analysis_id"))
      if (nextRelatedAnalysisId) setRelatedAnalysisId(nextRelatedAnalysisId)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [searchParams])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSubCategory(t.help.subcategories[category]?.[0] ?? "")
    }, 0)
    return () => window.clearTimeout(timer)
  }, [category, t.help.subcategories])

  useEffect(() => {
    if (isLoading || !isAuthenticated) return

    let alive = true
    const timer = window.setTimeout(() => {
      setIsHistoryLoading(true)
      analysisHistoryService
        .getAnalysisHistory(user?.id)
        .then((items) => {
          if (!alive) return
          setRecords(items.slice(0, 5))
        })
        .catch(() => {
          if (!alive) return
          setRecords([])
        })
        .finally(() => {
          if (alive) setIsHistoryLoading(false)
        })
    }, 0)

    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [isAuthenticated, isLoading, user?.id])

  const validate = () => {
    if (!category) return t.help.form.errors.category
    if (!title.trim()) return t.help.form.errors.titleRequired
    if (title.trim().length < 3) return t.help.form.errors.titleShort
    if (!content.trim()) return t.help.form.errors.contentRequired
    if (content.trim().length < 10) return t.help.form.errors.contentShort
    return ""
  }

  const hasLinkedQueryAnalysis =
    relatedAnalysisId !== null &&
    !records.some((record) => Number(record.analysisRequestId ?? record.id) === relatedAnalysisId)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationMessage = validate()
    if (validationMessage) {
      setError(validationMessage)
      return
    }

    try {
      setError("")
      setIsSubmitting(true)
      const inquiry = await inquiryService.createInquiry({
        category,
        subCategory,
        title: title.trim(),
        content: content.trim(),
        relatedAnalysisId,
      })
      setSuccess(true)
      window.setTimeout(() => router.push(`${ROUTES.HELP}/${inquiry.id}`), 900)
    } catch (error) {
      setError(error instanceof Error ? error.message : t.help.form.errors.submitFailed)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppShell title={t.help.form.title} showBack>
      {isLoading ? (
        <LoadingSpinner label={t.common.loading} />
      ) : !isAuthenticated ? (
        <LoginRequiredCard
          title={t.help.form.loginRequiredTitle}
          description={t.help.form.loginRequiredDescription}
          secondaryHref={ROUTES.HELP}
          secondaryLabel={t.help.title}
        />
      ) : (
        <form className={`${styles.stackMd} ${styles.helpPageStack}`} onSubmit={handleSubmit}>
          <section className={`${styles.card} ${styles.stackSm}`}>
            <span className={`${styles.iconBox} ${styles.iconLavender}`}>
              <MessageCircle className={styles.iconMd} />
            </span>
            <h1 className={styles.titleLg}>{t.help.form.title}</h1>
            <p className={styles.bodyText}>{t.help.form.description}</p>
          </section>

          {success && (
            <section className={`${styles.inquirySuccessCard} ${styles.stackSm}`}>
              <strong>{t.help.form.successTitle}</strong>
              <p>{t.help.form.successDescription}</p>
            </section>
          )}
          {error && <p className="form-error">{error}</p>}

          <section className={`${styles.card} ${styles.stackMd}`}>
            <label className={styles.label}>
              {t.help.form.category}
              <select
                className={styles.input}
                value={category}
                onChange={(event) => setCategory(event.target.value as InquiryCategory)}
              >
                {INQUIRY_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {t.help.categories[item]}
                  </option>
                ))}
              </select>
            </label>

            <p className={styles.inquiryGuide}>{t.help.categoryGuides[category]}</p>

            <label className={styles.label}>
              {t.help.form.subCategory}
              <select className={styles.input} value={subCategory} onChange={(event) => setSubCategory(event.target.value)}>
                {subcategories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              {t.help.form.inquiryTitle}
              <input
                className={styles.input}
                value={title}
                placeholder={t.help.form.titlePlaceholder}
                maxLength={200}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>

            <label className={styles.label}>
              {t.help.form.content}
              <textarea
                className={styles.textarea}
                value={content}
                placeholder={t.help.form.contentPlaceholder}
                onChange={(event) => setContent(event.target.value)}
              />
            </label>
          </section>

          <section className={`${styles.card} ${styles.stackSm}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.titleMd}>{t.help.form.relatedAnalysis}</h2>
              <span className={styles.mutedText}>{t.help.form.optional}</span>
            </div>
            {isHistoryLoading ? (
              <LoadingSpinner label={t.help.list.loading} />
            ) : records.length > 0 ? (
              <div className={styles.inquiryAnalysisList}>
                {records.map((record) => {
                  const requestId = Number(record.analysisRequestId ?? record.id)
                  if (!Number.isInteger(requestId) || requestId <= 0) return null
                  return (
                    <button
                      key={record.id}
                      type="button"
                      className={`${styles.inquiryAnalysisOption} ${relatedAnalysisId === requestId ? styles.inquiryAnalysisOptionActive : ""}`}
                      onClick={() => setRelatedAnalysisId((current) => (current === requestId ? null : requestId))}
                    >
                      <strong>{record.hospitalName}</strong>
                      <span>{record.categoryKoLabel ?? record.category} · {formatInquiryDate(record.analyzedAt ?? record.createdAt)}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className={styles.emptyCard}>
                <h2 className={styles.titleMd}>{t.help.form.noAnalysisTitle}</h2>
                <p className={styles.bodyText}>{t.help.form.noAnalysisDescription}</p>
              </div>
            )}
            {hasLinkedQueryAnalysis && (
              <p className={styles.inquiryGuide}>
                {t.help.form.linkedAnalysisNotice.replace("{id}", String(relatedAnalysisId))}
              </p>
            )}
          </section>

          <section className={`${styles.card} ${styles.stackSm}`}>
            <h2 className={styles.titleMd}>{t.help.form.attachment}</h2>
            <button type="button" className={styles.inquiryUploadBox} onClick={() => setAttachmentNotice(true)}>
              <ImagePlus className={styles.iconMd} />
              <span>{t.help.form.attachment}</span>
            </button>
            {attachmentNotice && <p className={styles.mutedText}>{t.help.form.attachmentDescription}</p>}
          </section>

          <button type="submit" className={styles.primaryButton} disabled={isSubmitting || success}>
            {isSubmitting ? t.help.form.submitting : t.help.form.submit}
          </button>
        </form>
      )}
    </AppShell>
  )
}
