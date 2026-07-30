"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { AdminSummaryCards } from "@/components/admin/AdminSummaryCards"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/lib/routes"
import type { AdminSummary } from "@/lib/types"
import { adminService } from "@/services/adminService"

type AdminMenuStatus = "connected" | "partial" | "sample" | "preparing" | "api-needed"
type AdminMenuItem = {
  href: string
  title: string
  description: string
  status: AdminMenuStatus
}

const operationMenus: AdminMenuItem[] = [
  { href: ROUTES.ADMIN_ANALYSES, title: "분석 관리", description: "실제 분석 요청과 결과 점수, 처리 상태를 확인합니다.", status: "connected" },
  { href: ROUTES.ADMIN_ERRORS, title: "오류 관리", description: "실패한 분석 요청과 서버 오류 메시지를 확인합니다.", status: "connected" },
  { href: ROUTES.ADMIN_USAGE, title: "사용량 관리", description: "서버에 기록된 분석 사용량과 차감 유형을 확인합니다.", status: "connected" },
  { href: ROUTES.ADMIN_MEMBERSHIPS, title: "멤버십 관리", description: "실제 결제 검증 전 구독 정책을 확인하는 준비 화면입니다.", status: "sample" },
  { href: ROUTES.ADMIN_AD_REWARDS, title: "광고 보상 관리", description: "광고 보상 지급 기능 연결 전 샘플 화면입니다.", status: "sample" },
  { href: ROUTES.ADMIN_SUPPORT, title: "고객 지원", description: "문의 관리는 실제 문의 관리 화면으로 연결하는 안내 허브입니다.", status: "partial" },
  { href: ROUTES.ADMIN_NOTICES, title: "공지사항", description: "사용자 공지와 FAQ 콘텐츠를 작성하고 게시 상태를 관리합니다.", status: "connected" },
  { href: ROUTES.ADMIN_SETTINGS, title: "설정", description: "서버의 진료과·플랜·사용량 정책을 읽기 전용으로 확인합니다.", status: "partial" },
  { href: ROUTES.ADMIN_SYSTEM, title: "시스템 관리", description: "메인 API와 DB, 분석 처리 현황을 읽기 전용으로 확인합니다.", status: "partial" },
  { href: ROUTES.ADMIN_AUDIT_LOGS, title: "감사 로그", description: "실제 관리자 작업 기록을 읽기 전용으로 확인합니다.", status: "connected" },
]

const MENU_PAGE_SIZE = 4
const menuPageMeta = [
  { eyebrow: "QUICK MENU", title: "핵심 운영 메뉴", description: "자주 확인하는 운영 메뉴를 모았어요." },
  { eyebrow: "ANALYSIS", title: "분석·사용량 관리", description: "분석 처리와 사용량 정책을 확인하세요." },
  { eyebrow: "CONTENT", title: "콘텐츠·고객 지원", description: "사용자 안내와 지원 메뉴를 관리하세요." },
  { eyebrow: "SYSTEM", title: "시스템·감사 관리", description: "서비스 정책과 운영 기록을 확인하세요." },
] as const

export default function AdminPage() {
  const { isAdmin, logout } = useAuth()
  const { t } = useLanguage()
  const [summary, setSummary] = useState<AdminSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
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
    { href: ROUTES.ADMIN_USERS, title: t.admin.menuUsersTitle, description: t.admin.menuUsersDescription, status: "connected" },
    { href: ROUTES.ADMIN_REVIEWS, title: "분석 품질 관리", description: t.admin.menuReviewsDescription, status: "connected" },
    { href: ROUTES.ADMIN_HOSPITALS, title: t.admin.menuHospitalsTitle, description: t.admin.menuHospitalsDescription, status: "connected" },
    { href: ROUTES.ADMIN_INQUIRIES, title: t.admin.menuInquiriesTitle, description: t.admin.menuInquiriesDescription, status: "connected" },
  ]
  const allMenus = [...coreMenus, ...operationMenus]
  const menuPageCount = Math.max(1, Math.ceil(allMenus.length / MENU_PAGE_SIZE))
  const visibleMenus = allMenus.slice(menuPage * MENU_PAGE_SIZE, (menuPage + 1) * MENU_PAGE_SIZE)
  const currentMenuMeta = menuPageMeta[menuPage] ?? menuPageMeta[menuPageMeta.length - 1]

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
          <div className="admin-hero-mark" aria-hidden="true"><ShieldCheck /><span>ADMIN CONSOLE</span></div>
        </section>

        {isLoading && <p>{t.admin.loading}</p>}
        {error && <p className="form-error">{error}</p>}
        {summary && <AdminSummaryCards summary={summary} />}

        <section className="admin-menu-deck" aria-labelledby="admin-menu-deck-title">
          <div className="admin-section-heading">
            <div>
              <p className="eyebrow">{currentMenuMeta.eyebrow}</p>
              <h2 id="admin-menu-deck-title">{currentMenuMeta.title}</h2>
              <p className="admin-menu-deck-description">{currentMenuMeta.description}</p>
            </div>
            <span className="admin-menu-page-label">{menuPage + 1} / {menuPageCount}</span>
          </div>
          <div key={menuPage} className={`admin-menu-grid admin-menu-page${visibleMenus.length <= 2 ? " admin-menu-page-short" : ""}`} aria-live="polite">
            {visibleMenus.map((menu) => <AdminMenu key={menu.href} {...menu} />)}
          </div>
          <nav className="admin-menu-pagination admin-menu-deck-pagination" aria-label="관리자 메뉴 페이지">
            <button type="button" onClick={() => setMenuPage((page) => Math.max(0, page - 1))} disabled={menuPage === 0} aria-label="이전 메뉴 페이지"><ChevronLeft aria-hidden="true" /><span>이전</span></button>
            <div aria-label={`${menuPage + 1} / ${menuPageCount} 페이지`}>
              {Array.from({ length: menuPageCount }, (_, index) => <button key={index} type="button" className={index === menuPage ? "active" : ""} onClick={() => setMenuPage(index)} aria-label={`${index + 1}페이지`} aria-current={index === menuPage ? "page" : undefined} />)}
            </div>
            <button type="button" onClick={() => setMenuPage((page) => Math.min(menuPageCount - 1, page + 1))} disabled={menuPage === menuPageCount - 1} aria-label="다음 메뉴 페이지"><span>다음</span><ChevronRight aria-hidden="true" /></button>
          </nav>
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
