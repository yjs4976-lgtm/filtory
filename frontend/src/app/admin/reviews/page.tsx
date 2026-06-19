import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"

export default function AdminReviewsPage() {
  return (
    <AdminAppShell title="리뷰 관리">
      <AdminGuard>
        <section className="page-title">
          <p className="eyebrow">ADMIN REVIEWS</p>
          <h1>리뷰 분석 관리</h1>
          <p>AI 리뷰 분석 결과를 관리하는 화면입니다.</p>
        </section>

        <section className="soft-card">
          <p>리뷰 분석 테이블은 백엔드 API 연결 후 추가하면 됩니다.</p>
        </section>
      </AdminGuard>
    </AdminAppShell>
  )
}
