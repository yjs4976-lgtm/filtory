"use client"

import type { MyReport } from "@/lib/types"
import { ReportStatusBadge } from "./ReportStatusBadge"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

interface MyReportCardProps {
  report: MyReport
  onCancel: (id: number) => void
}

export function MyReportCard({ report, onCancel }: MyReportCardProps) {
  const { t } = useLanguage()
  return (
    <article className={`${styles.card} ${styles.stackSm}`}>
      <div className={styles.rowBetween}>
        <div>
          <h2 className={styles.titleMd}>{report.hospitalName}</h2>
          <p className={styles.bodyText}>
            {report.targetType === "review" ? t.mypage.reportReview : t.mypage.reportHospital} · {report.createdAt}
          </p>
        </div>
        <ReportStatusBadge status={report.status} />
      </div>
      <p className={styles.recordMeta}>{report.reason}</p>
      {report.adminReply && (
        <div className={`${styles.softCard} ${styles.stackSm}`}>
          <strong>{t.mypage.adminReply}</strong>
          <p className={styles.mutedText}>{report.adminReply}</p>
        </div>
      )}
      {report.status !== "COMPLETED" && (
        <button type="button" className={styles.dangerButton} onClick={() => onCancel(report.id)}>
          {t.mypage.cancelReport}
        </button>
      )}
    </article>
  )
}
