"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { AdminSummaryCards } from "@/components/admin/AdminSummaryCards"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/lib/routes"
import type { AdminSummary } from "@/lib/types"
import { adminService } from "@/services/adminService"

export default function AdminPage() {
  const { isAdmin } = useAuth()
  const [summary, setSummary] = useState<AdminSummary | null>(null)

  useEffect(() => {
    if (!isAdmin) return

    let alive = true

    adminService.getSummary().then((result) => {
      if (alive) setSummary(result.data)
    }).catch(() => {
      if (alive) setSummary(null)
    })

    return () => {
      alive = false
    }
  }, [isAdmin])

  return (
    <AdminAppShell title="관리자">
      <AdminGuard>
        <section className="page-title">
          <p className="eyebrow">ADMIN</p>
          <h1>관리자 대시보드</h1>
          <p>Filtory 회원, 리뷰 분석, 신고 리뷰, 병원 정보를 관리합니다.</p>
        </section>

        {summary && <AdminSummaryCards summary={summary} />}

        <section className="admin-menu-grid">
          <Link href={ROUTES.ADMIN_USERS} className="soft-card admin-menu-card">
            <strong>회원 관리</strong>
            <p>회원 권한, 상태, 탈퇴 회원을 관리합니다.</p>
          </Link>

          <Link href={ROUTES.ADMIN_REVIEWS} className="soft-card admin-menu-card">
            <strong>리뷰 분석 관리</strong>
            <p>AI 분석 결과와 리뷰 데이터를 확인합니다.</p>
          </Link>

          <Link href={ROUTES.ADMIN_REPORTS} className="soft-card admin-menu-card">
            <strong>신고/의심 리뷰 관리</strong>
            <p>광고성, 반복 패턴, 신고 리뷰를 검토합니다.</p>
          </Link>

          <Link href={ROUTES.ADMIN_HOSPITALS} className="soft-card admin-menu-card">
            <strong>병원 정보 관리</strong>
            <p>병원명, 링크, 플레이스 완성도 정보를 관리합니다.</p>
          </Link>
        </section>
      </AdminGuard>
    </AdminAppShell>
  )
}
