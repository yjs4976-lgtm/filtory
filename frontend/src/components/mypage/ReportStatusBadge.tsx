import type { MyReport } from "@/lib/types"
import styles from "@/styles/App.module.css"

const statusLabels: Record<MyReport["status"], string> = {
  RECEIVED: "접수됨",
  REVIEWING: "검토 중",
  COMPLETED: "처리 완료",
  REJECTED: "반려됨",
}

export function ReportStatusBadge({ status }: { status: MyReport["status"] }) {
  return <span className={styles.neutralPill}>{statusLabels[status]}</span>
}
