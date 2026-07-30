"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowRight, CircleCheck, Clock3, MessageCircle, ShieldAlert } from "lucide-react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { ROUTES } from "@/lib/routes"
import { adminReviewService } from "@/services/adminReviewService"
import { inquiryService } from "@/services/inquiryService"

type SupportSummary = {
  pendingInquiries: number
  inProgressInquiries: number
  pendingReports: number
  reviewingReports: number
}

const EMPTY_SUMMARY: SupportSummary = {
  pendingInquiries: 0,
  inProgressInquiries: 0,
  pendingReports: 0,
  reviewingReports: 0,
}

export default function AdminSupportPage() {
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    async function loadSummary() {
      try {
        setIsLoading(true)
        setError("")
        const [pendingInquiries, inProgressInquiries, pendingReports, reviewingReports] = await Promise.all([
          inquiryService.getAdminInquiries({ status: "PENDING", page: 1, perPage: 1 }),
          inquiryService.getAdminInquiries({ status: "IN_PROGRESS", page: 1, perPage: 1 }),
          adminReviewService.getReviewCases({ status: "pending", caseType: "user_report", page: 1, perPage: 1 }),
          adminReviewService.getReviewCases({ status: "reviewing", caseType: "user_report", page: 1, perPage: 1 }),
        ])
        if (!active) return
        setSummary({
          pendingInquiries: pendingInquiries.total,
          inProgressInquiries: inProgressInquiries.total,
          pendingReports: pendingReports.total,
          reviewingReports: reviewingReports.total,
        })
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "고객 지원 현황을 불러오지 못했습니다.")
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadSummary()
    return () => {
      active = false
    }
  }, [])

  return (
    <AdminAppShell title="고객 지원">
      <AdminGuard>
        <section className="page-title admin-support-title">
          <p className="eyebrow">ADMIN SUPPORT</p>
          <h1>고객 지원 허브</h1>
          <p>문의와 사용자 신고의 처리 현황을 한눈에 확인하세요.</p>
        </section>

        {error && <p className="form-error">{error}</p>}

        <section className="admin-support-overview" aria-busy={isLoading}>
          <header>
            <div><span>SUPPORT OVERVIEW</span><h2>오늘 확인할 지원 업무</h2></div>
            <p>{isLoading ? "운영 현황을 불러오는 중이에요." : "실제 문의·품질 검토 API 기준입니다."}</p>
          </header>
          <div className="admin-support-kpis">
            <SupportKpi icon={<Clock3 />} label="답변 대기 문의" value={summary.pendingInquiries} loading={isLoading} />
            <SupportKpi icon={<MessageCircle />} label="처리 중 문의" value={summary.inProgressInquiries} loading={isLoading} />
            <SupportKpi icon={<ShieldAlert />} label="대기 중 신고" value={summary.pendingReports} loading={isLoading} />
            <SupportKpi icon={<CircleCheck />} label="검토 중 신고" value={summary.reviewingReports} loading={isLoading} />
          </div>
        </section>

        <section className="admin-support-route-grid">
          <Link href={ROUTES.ADMIN_INQUIRIES} className="admin-support-route-card">
            <div className="admin-support-route-icon"><MessageCircle /></div>
            <div><span>INQUIRIES</span><h2>문의 운영</h2><p>회원 문의를 확인하고 상태 변경, 답변 등록과 첨부파일 확인을 진행합니다.</p></div>
            <strong>문의 관리 열기 <ArrowRight /></strong>
          </Link>
          <Link href={ROUTES.ADMIN_REVIEWS} className="admin-support-route-card admin-support-route-card-report">
            <div className="admin-support-route-icon"><ShieldAlert /></div>
            <div><span>REPORTS · QUALITY</span><h2>신고·품질 검토</h2><p>사용자 신고와 분석 품질 검토 항목을 확인하고 처리 상태와 관리자 메모를 관리합니다.</p></div>
            <strong>검토 큐 열기 <ArrowRight /></strong>
          </Link>
        </section>

        <p className="admin-support-note">신고는 분석 품질 관리의 사용자 신고 큐에서 함께 처리되며, 별도 샘플 데이터는 사용하지 않습니다.</p>
      </AdminGuard>
    </AdminAppShell>
  )
}

function SupportKpi({ icon, label, value, loading }: { icon: ReactNode; label: string; value: number; loading: boolean }) {
  return <article><div>{icon}</div><span>{label}</span><strong>{loading ? "—" : value}</strong></article>
}
