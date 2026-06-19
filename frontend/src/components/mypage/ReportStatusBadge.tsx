import type { MyReport } from "@/lib/types"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function ReportStatusBadge({ status }: { status: MyReport["status"] }) {
  const { t } = useLanguage()
  const statusLabels: Record<MyReport["status"], string> = {
    RECEIVED: t.mypage.reportReceived,
    REVIEWING: t.mypage.reportReviewing,
    COMPLETED: t.mypage.reportCompleted,
    REJECTED: t.mypage.reportRejected,
  }
  return <span className={styles.neutralPill}>{statusLabels[status]}</span>
}
