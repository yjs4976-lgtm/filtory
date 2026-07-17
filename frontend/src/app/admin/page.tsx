"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { AdminSummaryCards } from "@/components/admin/AdminSummaryCards"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/lib/routes"
import type { AdminSummary } from "@/lib/types"
import { adminService } from "@/services/adminService"

const operationMenus = [
  [ROUTES.ADMIN_ANALYSES, "분석 관리", "분석 결과와 검토 대상 정보를 확인합니다."],
  [ROUTES.ADMIN_ERRORS, "오류 관리", "분석 오류와 재처리 대상을 확인합니다."],
  [ROUTES.ADMIN_USAGE, "사용량 관리", "분석 이용 현황을 확인합니다."],
  [ROUTES.ADMIN_MEMBERSHIPS, "멤버십 관리", "구독 및 이용 정책 정보를 확인합니다."],
  [ROUTES.ADMIN_AD_REWARDS, "광고 보상 관리", "광고 보상 지급 내역을 확인합니다."],
  [ROUTES.ADMIN_SUPPORT, "고객 지원", "문의와 신고 운영 현황을 확인합니다."],
  [ROUTES.ADMIN_NOTICES, "공지사항", "공지사항과 FAQ 콘텐츠를 확인합니다."],
  [ROUTES.ADMIN_SETTINGS, "설정", "서비스 운영 설정을 확인합니다."],
  [ROUTES.ADMIN_SYSTEM, "시스템 관리", "서비스 시스템 상태를 확인합니다."],
  [ROUTES.ADMIN_AUDIT_LOGS, "감사 로그", "관리자 작업 기록을 확인합니다."],
] as const

export default function AdminPage() {
  const { isAdmin, logout } = useAuth()
  const { t } = useLanguage()
  const [summary, setSummary] = useState<AdminSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isAdmin) return
    let alive = true
    adminService.getSummary()
      .then((result) => { if (alive) setSummary(result.data) })
      .catch((error) => { if (alive) setError(error instanceof Error ? error.message : t.admin.loadFailed) })
      .finally(() => { if (alive) setIsLoading(false) })
    return () => { alive = false }
  }, [isAdmin, t.admin.loadFailed])

  return (
    <AdminAppShell title={t.nav.admin}>
      <AdminGuard>
        <section className="page-title">
          <p className="eyebrow">ADMIN</p>
          <h1>{t.admin.dashboard}</h1>
          <p>{t.admin.dashboardDescription}</p>
        </section>

        {isLoading && <p>{t.admin.loading}</p>}
        {error && <p className="form-error">{error}</p>}
        {summary && <AdminSummaryCards summary={summary} />}

        <section className="admin-menu-grid" aria-label="핵심 관리자 메뉴">
          <AdminMenu href={ROUTES.ADMIN_USERS} title={t.admin.menuUsersTitle} description={t.admin.menuUsersDescription} />
          <AdminMenu href={ROUTES.ADMIN_REVIEWS} title={t.admin.menuReviewsTitle} description={t.admin.menuReviewsDescription} />
          <AdminMenu href={ROUTES.ADMIN_HOSPITALS} title={t.admin.menuHospitalsTitle} description={t.admin.menuHospitalsDescription} />
          <AdminMenu href={ROUTES.ADMIN_INQUIRIES} title={t.admin.menuInquiriesTitle} description={t.admin.menuInquiriesDescription} />
        </section>

        <section className="page-title admin-all-menu-title">
          <p className="eyebrow">ADMIN MENU</p>
          <h2>전체 관리자 메뉴</h2>
          <p>추가 운영 화면은 예전 관리자 화면 구조 안에서 접근할 수 있습니다.</p>
        </section>
        <section className="admin-menu-grid" aria-label="전체 관리자 메뉴">
          {operationMenus.map(([href, title, description]) => <AdminMenu key={href} href={href} title={title} description={description} />)}
        </section>
        <button type="button" className="small-button admin-logout-button" onClick={() => void logout(ROUTES.LOGIN)}>로그아웃</button>
      </AdminGuard>
    </AdminAppShell>
  )
}

function AdminMenu({ href, title, description }: { href: string; title: string; description: string }) {
  return <Link href={href} className="soft-card admin-menu-card"><strong>{title}</strong><p>{description}</p></Link>
}
