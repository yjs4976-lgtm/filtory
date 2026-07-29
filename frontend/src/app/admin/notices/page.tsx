import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { AdminSampleNotice } from "@/components/admin/AdminSampleNotice"

export default function AdminNoticesPage() {
  return <AdminAppShell title="공지사항·FAQ"><AdminGuard>
    <section className="page-title"><p className="eyebrow">ADMIN CONTENT</p><h1>공지사항·FAQ</h1><p>공지사항·FAQ 콘텐츠 관리는 DB 테이블 적용 후 연결 예정입니다.</p></section>
    <AdminSampleNotice message="현재는 사용자에게 노출되는 공지 관리 API나 저장·수정 기능을 제공하지 않아요." />
    <section className="soft-card admin-table-card"><h2>준비 상태</h2><p>Supabase SQL Editor용 스키마 파일만 준비되어 있으며 실제 DB 적용과 API 연결은 별도 작업이 필요합니다.</p></section>
  </AdminGuard></AdminAppShell>
}
