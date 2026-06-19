import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"

export default function AdminHospitalsPage() {
  return (
    <AdminAppShell title="병원 관리">
      <AdminGuard>
        <section className="page-title">
          <p className="eyebrow">ADMIN HOSPITALS</p>
          <h1>병원 정보 관리</h1>
          <p>병원명, 네이버 플레이스 링크, 구글맵 링크 등을 관리합니다.</p>
        </section>

        <section className="soft-card">
          <p>병원 정보 테이블은 백엔드 API 연결 후 추가하면 됩니다.</p>
        </section>
      </AdminGuard>
    </AdminAppShell>
  )
}
