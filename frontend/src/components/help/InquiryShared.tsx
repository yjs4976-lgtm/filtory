import type { Inquiry, InquiryCategory, InquiryStatus, InquiryRelatedAnalysis } from "@/services/inquiryService"
import styles from "@/styles/App.module.css"

export const INQUIRY_CATEGORIES: InquiryCategory[] = [
  "ANALYSIS_RESULT",
  "REVIEW_INPUT",
  "ACCOUNT",
  "PAYMENT",
  "SUGGESTION",
  "OTHER",
]

export const INQUIRY_STATUSES: InquiryStatus[] = ["PENDING", "IN_PROGRESS", "ANSWERED"]

export function formatInquiryDate(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`
}

export function InquiryStatusBadge({ status, label }: { status: InquiryStatus; label: string }) {
  const className =
    status === "ANSWERED"
      ? styles.inquiryStatusAnswered
      : status === "IN_PROGRESS"
        ? styles.inquiryStatusProgress
        : styles.inquiryStatusPending

  return <span className={`${styles.inquiryStatusBadge} ${className}`}>{label}</span>
}

export function InquiryRelatedAnalysisCard({
  analysis,
  title,
  totalScoreLabel,
  variant = "card",
}: {
  analysis: InquiryRelatedAnalysis
  title: string
  totalScoreLabel: string
  variant?: "card" | "panel"
}) {
  const className = variant === "panel" ? `${styles.inquiryRelatedPanel} ${styles.stackSm}` : `${styles.card} ${styles.stackSm}`

  return (
    <section className={className}>
      <h2 className={styles.titleMd}>{title}</h2>
      <div className={styles.inquiryMetaGrid}>
        <div>
          <span>{analysis.hospitalName ?? "-"}</span>
          <strong>{analysis.category ?? "-"}</strong>
        </div>
        <div>
          <span>{formatInquiryDate(analysis.completedAt ?? analysis.createdAt)}</span>
          <strong>
            {totalScoreLabel} {analysis.totalScore ?? "-"}
          </strong>
        </div>
      </div>
    </section>
  )
}

export function inquiryShortDescription(inquiry: Inquiry, statusDescriptions: Record<InquiryStatus, string>) {
  return statusDescriptions[inquiry.status] ?? ""
}
