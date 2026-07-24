"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { AdminSummaryCards } from "@/components/admin/AdminSummaryCards"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/lib/routes"
import type { AdminSummary } from "@/lib/types"
import { adminService } from "@/services/adminService"

type AdminMenuStatus = "connected" | "partial" | "sample" | "preparing" | "api-needed"
type AdminMenuFilter = "connected" | "pending" | "all"
type AdminMenuItem = {
  href: string
  title: string
  description: string
  status: AdminMenuStatus
}

const operationMenus: AdminMenuItem[] = [
  { href: ROUTES.ADMIN_ANALYSES, title: "분석 관리", description: "샘플 데이터로 분석 결과와 검토 대상을 확인합니다.", status: "sample" },
  { href: ROUTES.ADMIN_ERRORS, title: "오류 관리", description: "샘플 데이터로 분석 오류와 재처리 대상을 확인합니다.", status: "sample" },
  { href: ROUTES.ADMIN_USAGE, title: "사용량 관리", description: "샘플 데이터로 분석 이용 현황을 확인합니다.", status: "sample" },
  { href: ROUTES.ADMIN_MEMBERSHIPS, title: "멤버십 관리", description: "샘플 데이터로 구독 및 이용 정책을 확인합니다.", status: "sample" },
  { href: ROUTES.ADMIN_AD_REWARDS, title: "광고 보상 관리", description: "샘플 데이터로 광고 보상 지급 내역을 확인합니다.", status: "sample" },
  { href: ROUTES.ADMIN_SUPPORT, title: "고객 지원", description: "샘플 데이터로 문의와 신고 운영 현황을 확인합니다.", status: "sample" },
  { href: ROUTES.ADMIN_NOTICES, title: "공지사항", description: "공지사항과 FAQ 콘텐츠를 위한 준비 중 화면입니다.", status: "preparing" },
  { href: ROUTES.ADMIN_SETTINGS, title: "설정", description: "서비스 운영 설정을 조회하며 저장 API 연결이 필요합니다.", status: "api-needed" },
  { href: ROUTES.ADMIN_SYSTEM, title: "시스템 관리", description: "서비스 시스템 상태를 위한 준비 중 화면입니다.", status: "preparing" },
  { href: ROUTES.ADMIN_AUDIT_LOGS, title: "감사 로그", description: "관리자 작업 기록 조회 API 연결이 필요합니다.", status: "api-needed" },
]

const MENU_PAGE_SIZE = 4

export default function AdminPage() {
  const { isAdmin, logout } = useAuth()
  const { t } = useLanguage()
  const [summary, setSummary] = useState<AdminSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [menuFilter, setMenuFilter] = useState<AdminMenuFilter>("pending")
  const [menuPage, setMenuPage] = useState(0)

  useEffect(() => {
    if (!isAdmin) return
    let alive = true
    adminService.getSummary()
      .then((result) => { if (alive) setSummary(result.data) })
      .catch((error) => { if (alive) setError(error instanceof Error ? error.message : t.admin.loadFailed) })
      .finally(() => { if (alive) setIsLoading(false) })
    return () => { alive = false }
  }, [isAdmin, t.admin.loadFailed])

  const coreMenus: AdminMenuItem[] = [
    { href: ROUTES.ADMIN_USERS, title: t.admin.menuUsersTitle, description: t.admin.menuUsersDescription, status: "partial" },
    { href: ROUTES.ADMIN_REVIEWS, title: "분석 품질 관리", description: t.admin.menuReviewsDescription, status: "connected" },
    { href: ROUTES.ADMIN_HOSPITALS, title: t.admin.menuHospitalsTitle, description: t.admin.menuHospitalsDescription, status: "connected" },
    { href: ROUTES.ADMIN_INQUIRIES, title: t.admin.menuInquiriesTitle, description: t.admin.menuInquiriesDescription, status: "connected" },
  ]
  const allMenus = [...coreMenus, ...operationMenus]
  const filteredMenus = allMenus.filter((menu) => {
    if (menuFilter === "connected") return menu.status === "connected" || menu.status === "partial"
    if (menuFilter === "pending") return menu.status !== "connected" && menu.status !== "partial"
    return true
  })
  const menuPageCount = Math.max(1, Math.ceil(filteredMenus.length / MENU_PAGE_SIZE))
  const visibleMenus = filteredMenus.slice(menuPage * MENU_PAGE_SIZE, (menuPage + 1) * MENU_PAGE_SIZE)

  const selectMenuFilter = (filter: AdminMenuFilter) => {
    setMenuFilter(filter)
    setMenuPage(0)
  }

  return (
    <AdminAppShell title={t.nav.admin}>
      <AdminGuard>
        <section className="admin-home-hero">
          <p className="eyebrow">ADMIN</p>
          <h1>{t.admin.dashboard}</h1>
          <p>회원, 분석 품질, 병원 정보 운영 상태를 한눈에 확인해요.</p>
          <div className="admin-hero-chips" aria-label="관리자 운영 상태">
            <span>운영 메뉴</span>
            <span>준비 중 메뉴 포함</span>
            <span>관리자 무제한</span>
          </div>
        </section>

        {isLoading && <p>{t.admin.loading}</p>}
        {error && <p className="form-error">{error}</p>}
        {summary && <AdminSummaryCards summary={summary} />}

        <section className="admin-core-menu-panel" aria-labelledby="admin-core-menu-title">
          <div className="admin-section-heading">
            <div><p className="eyebrow">QUICK MENU</p><h2 id="admin-core-menu-title">핵심 운영 메뉴</h2></div>
            <span>자주 확인하는 메뉴예요</span>
          </div>
          <div className="admin-menu-grid">
            {coreMenus.map((menu) => <AdminMenu key={menu.href} {...menu} />)}
          </div>
        </section>

        <section className="admin-menu-browser" aria-labelledby="admin-menu-browser-title">
          <div className="admin-section-heading">
            <div><p className="eyebrow">ADMIN MENU</p><h2 id="admin-menu-browser-title">운영 메뉴 찾아보기</h2></div>
          </div>
          <p className="admin-menu-helper">연결된 운영 메뉴와 준비 중인 메뉴를 나눠 확인할 수 있어요. 준비 중 메뉴는 샘플 데이터 또는 API 연결 전 화면입니다.</p>
          <div className="admin-menu-tabs" role="tablist" aria-label="관리자 메뉴 상태 필터">
            {([["connected", "연결됨"], ["pending", "샘플·준비 중"], ["all", "전체"]] as const).map(([value, label]) => (
              <button key={value} type="button" role="tab" aria-selected={menuFilter === value} className={menuFilter === value ? "active" : ""} onClick={() => selectMenuFilter(value)}>{label}</button>
            ))}
          </div>
          <div className="admin-menu-grid" aria-live="polite">
            {visibleMenus.map((menu) => <AdminMenu key={menu.href} {...menu} />)}
          </div>
          {menuPageCount > 1 && <nav className="admin-menu-pagination" aria-label="관리자 메뉴 페이지">
            <button type="button" onClick={() => setMenuPage((page) => Math.max(0, page - 1))} disabled={menuPage === 0} aria-label="이전 메뉴 페이지"><ChevronLeft aria-hidden="true" /></button>
            <div aria-label={`${menuPage + 1} / ${menuPageCount} 페이지`}>
              {Array.from({ length: menuPageCount }, (_, index) => <span key={index} className={index === menuPage ? "active" : ""} />)}
            </div>
            <button type="button" onClick={() => setMenuPage((page) => Math.min(menuPageCount - 1, page + 1))} disabled={menuPage === menuPageCount - 1} aria-label="다음 메뉴 페이지"><ChevronRight aria-hidden="true" /></button>
          </nav>}
        </section>

        <aside className="admin-unlimited-note">관리자 계정은 운영 확인을 위해 상세 분석 제한이 적용되지 않아요.</aside>
        <button type="button" className="admin-logout-button" onClick={() => void logout(ROUTES.LOGIN)}>관리자 로그아웃</button>
      </AdminGuard>
    </AdminAppShell>
  )
}

const statusLabels: Record<AdminMenuStatus, string> = {
  connected: "연결됨",
  partial: "일부 연결",
  sample: "샘플",
  preparing: "준비 중",
  "api-needed": "API 연결 필요",
}

function AdminMenu({ href, title, description, status }: AdminMenuItem) {
  return <Link href={href} className={`admin-menu-card admin-menu-card-${status}`}>
    <span className="admin-menu-card-heading"><strong>{title}</strong><span className={`admin-menu-status admin-menu-status-${status}`}>{statusLabels[status]}</span></span>
    <p>{description}</p>
    <span className="admin-menu-arrow" aria-hidden="true"><ChevronRight /></span>
  </Link>
}
