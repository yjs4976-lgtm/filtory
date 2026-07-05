"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { AppShell } from "@/components/common/AppShell"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { LoginRequiredCard } from "@/components/common/LoginRequiredCard"
import {
  INQUIRY_STATUSES,
  InquiryRelatedAnalysisCard,
  InquiryStatusBadge,
  formatInquiryDate,
} from "@/components/help/InquiryShared"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/lib/routes"
import { inquiryService, type Inquiry } from "@/services/inquiryService"
import styles from "@/styles/App.module.css"

export default function InquiryDetailPage() {
  const params = useParams<{ id: string }>()
  const { t } = useLanguage()
  const { isAuthenticated, isLoading } = useAuth()
  const [inquiry, setInquiry] = useState<Inquiry | null>(null)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState("")
  const [downloadError, setDownloadError] = useState("")
  const inquiryId = Number(params.id)
  const hasValidInquiryId = Number.isInteger(inquiryId) && inquiryId > 0

  useEffect(() => {
    if (isLoading || !isAuthenticated || !hasValidInquiryId) return

    let alive = true
    const timer = window.setTimeout(() => {
      setIsFetching(true)
      inquiryService
        .getMyInquiry(inquiryId)
        .then((result) => {
          if (alive) setInquiry(result)
        })
        .catch((error) => {
          if (alive) setError(error instanceof Error ? error.message : t.help.detail.loadFailed)
        })
        .finally(() => {
          if (alive) setIsFetching(false)
        })
    }, 0)

    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [hasValidInquiryId, inquiryId, isAuthenticated, isLoading, t.help.detail.loadFailed])

  const currentStep = inquiry ? Math.max(0, INQUIRY_STATUSES.indexOf(inquiry.status)) : 0
  const handleDownloadAttachment = async () => {
    if (!inquiry?.attachment) return
    try {
      setDownloadError("")
      await inquiryService.downloadAttachment(inquiry.id, inquiry.attachment.fileName)
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : t.help.detail.loadFailed)
    }
  }

  return (
    <AppShell title={t.help.title} showBack>
      {isLoading ? (
        <LoadingSpinner label={t.common.loading} />
      ) : !isAuthenticated ? (
        <LoginRequiredCard
          title={t.help.form.loginRequiredTitle}
          description={t.help.form.loginRequiredDescription}
          secondaryHref={ROUTES.HELP}
          secondaryLabel={t.help.title}
        />
      ) : !hasValidInquiryId ? (
        <p className="form-error">{t.help.detail.loadFailed}</p>
      ) : isFetching ? (
        <LoadingSpinner label={t.help.detail.loading} />
      ) : error || !inquiry ? (
        <p className="form-error">{error || t.help.detail.loadFailed}</p>
      ) : (
        <div className={`${styles.stackMd} ${styles.helpPageStack}`}>
          <section className={`${styles.card} ${styles.stackSm}`}>
            <div className={styles.rowBetween}>
              <InquiryStatusBadge status={inquiry.status} label={t.help.status[inquiry.status]} />
              <span className={styles.mutedText}>{formatInquiryDate(inquiry.createdAt)}</span>
            </div>
            <h1 className={styles.titleLg}>{inquiry.title}</h1>
            <div className={styles.inquiryDetailMeta}>
              <span>{t.help.detail.category}: {t.help.categories[inquiry.category]}</span>
              {inquiry.subCategory && <span>{t.help.detail.subCategory}: {inquiry.subCategory}</span>}
            </div>
          </section>

          <section className={`${styles.card} ${styles.inquiryTimeline}`}>
            {t.help.detail.timeline.map((label, index) => (
              <div
                key={label}
                className={`${styles.inquiryTimelineStep} ${index <= currentStep ? styles.inquiryTimelineStepActive : ""}`}
              >
                <span>{index + 1}</span>
                <strong>{label}</strong>
              </div>
            ))}
          </section>

          <section className={`${styles.card} ${styles.stackSm}`}>
            <h2 className={styles.titleMd}>{t.help.detail.contentTitle}</h2>
            <p className={styles.inquiryContentText}>{inquiry.content}</p>
          </section>

          {inquiry.attachment && (
            <section className={`${styles.card} ${styles.stackSm}`}>
              <h2 className={styles.titleMd}>{t.help.detail.attachmentTitle}</h2>
              <button type="button" className={styles.smallPillButton} onClick={handleDownloadAttachment}>
                {t.help.detail.attachmentDownload}
              </button>
              {downloadError && <p className="form-error">{downloadError}</p>}
              <p className={styles.mutedText}>{inquiry.attachment.fileName}</p>
            </section>
          )}

          {inquiry.relatedAnalysis && (
            <InquiryRelatedAnalysisCard
              analysis={inquiry.relatedAnalysis}
              title={t.help.detail.relatedAnalysisTitle}
              totalScoreLabel={t.help.detail.totalScore}
            />
          )}

          <section className={`${styles.card} ${styles.stackSm}`}>
            <h2 className={styles.titleMd}>{t.help.detail.answerTitle}</h2>
            {inquiry.answer ? (
              <>
                <p className={styles.inquiryContentText}>{inquiry.answer.content}</p>
                <span className={styles.mutedText}>{t.help.detail.answeredAt}: {formatInquiryDate(inquiry.answer.updatedAt ?? inquiry.answer.createdAt)}</span>
              </>
            ) : (
              <div className={styles.inquiryAnswerEmpty}>
                <strong>{t.help.detail.noAnswerTitle}</strong>
                <p>{t.help.detail.noAnswerDescription}</p>
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  )
}
