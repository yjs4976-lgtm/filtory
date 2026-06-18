import type { AdminSummary } from "@/lib/types"

interface AdminSummaryCardsProps {
  summary: AdminSummary
}

export function AdminSummaryCards({ summary }: AdminSummaryCardsProps) {
  return (
    <section className="admin-summary-grid">
      <div className="soft-card">
        <p>전체 회원</p>
        <strong>{summary.totalUsers}</strong>
      </div>

      <div className="soft-card">
        <p>활성 회원</p>
        <strong>{summary.activeUsers}</strong>
      </div>

      <div className="soft-card">
        <p>정지 회원</p>
        <strong>{summary.suspendedUsers}</strong>
      </div>

      <div className="soft-card">
        <p>탈퇴 회원</p>
        <strong>{summary.withdrawnUsers}</strong>
      </div>
    </section>
  )
}
