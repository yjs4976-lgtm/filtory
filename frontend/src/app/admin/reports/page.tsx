import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"

export default function AdminReportsPage() {
  return (
    <AdminAppShell title="검토 관리">
      <AdminGuard>
        <section className="page-title">
          <p className="eyebrow">ADMIN REPORTS</p>
          <h1>검토/의심 리뷰 관리</h1>
          <p>광고성 리뷰, 반복 패턴 리뷰, 검토 요청 리뷰를 관리하는 화면입니다.</p>
        </section>

        <section className="soft-card">
          <p>검토 요청 리뷰 테이블은 백엔드 API 연결 후 추가하면 됩니다.</p>
        </section>
      </AdminGuard>
    </AdminAppShell>
  )
}
