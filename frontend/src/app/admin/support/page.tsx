import Link from "next/link"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { ROUTES } from "@/lib/routes"

export default function AdminSupportPage() {
  return <AdminAppShell title="고객 지원"><AdminGuard>
    <section className="page-title"><p className="eyebrow">ADMIN SUPPORT</p><h1>고객 지원 허브</h1><p>실제 문의 처리는 문의 관리 화면에서 진행합니다.</p></section>
    <section className="soft-card admin-table-card">
      <h2>문의 운영</h2>
      <p>회원 문의 조회, 상태 변경과 답변 등록은 연결된 문의 관리 기능을 이용해 주세요.</p>
      <Link className="small-button" href={ROUTES.ADMIN_INQUIRIES}>문의 관리 열기</Link>
    </section>
    <section className="soft-card admin-table-card"><h2>신고·통합 지원</h2><p>별도 고객지원 통합 API는 아직 준비 중이며 이 화면에서는 변경 작업을 제공하지 않습니다.</p></section>
  </AdminGuard></AdminAppShell>
}
