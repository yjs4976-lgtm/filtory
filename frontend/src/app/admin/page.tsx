"use client"

import { useState } from "react"
import Link from "next/link"
import { Activity, AlertCircle, ChevronRight, CircleHelp, Clock3, FileSearch, Gift, LayoutDashboard, MessageCircleQuestion, RefreshCw, ShieldCheck, Sparkles, UserCheck, Users, Zap } from "lucide-react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { ADMIN_KPIS, DASHBOARD_ACTIVITY, DEPARTMENT_USAGE, WEEKLY_USAGE } from "@/mocks/adminData"
import { ROUTES } from "@/lib/routes"

const icons = [Users,UserCheck,Users,Sparkles,Zap,Activity]
const dayNames: Record<string,string> = { 월:"월요일",화:"화요일",수:"수요일",목:"목요일",금:"금요일",토:"토요일",일:"일요일" }
export default function AdminPage() {
  const [selectedDay,setSelectedDay]=useState("금")
  const selectedUsage=WEEKLY_USAGE.find((item)=>item.day===selectedDay) ?? WEEKLY_USAGE[4]
  return <AdminAppShell title="관리자 대시보드"><AdminGuard>
    <section className="admin-dashboard-hero">
      <div className="admin-dashboard-hero-title"><span><LayoutDashboard /></span><div><h2>관리자 대시보드</h2><p>Filtory 사용자와 분석 이용 현황을 확인하세요.</p></div></div>
      <section className="admin-kpi-grid" aria-label="핵심 지표">{ADMIN_KPIS.map(([label,value,change],i) => { const Icon=icons[i]; return <article key={label} className="admin-kpi"><span><Icon /></span><div><p>{label}</p><strong>{value}</strong><small className="up">{change}</small></div></article> })}</section>
    </section>

    <h2 className="admin-section-title">운영 현황</h2>
    <section className="admin-panel admin-weekly-panel"><div className="admin-panel-heading"><div><h3>최근 7일 분석 건수</h3><small>지난주보다 12.6% 증가</small></div><span>총 803건</span></div><div className="admin-bars" aria-label="최근 7일 분석 건수 막대 그래프">{WEEKLY_USAGE.map(({day,value}) => <button type="button" key={day} className={selectedDay===day?"selected":""} onClick={()=>setSelectedDay(day)} aria-label={`${dayNames[day]} 전체 ${value}건`}><span style={{height:`${value/145*100}%`}}><b>{value}</b></span><small>{day}</small></button>)}</div><div className="admin-chart-detail" aria-live="polite"><strong>{dayNames[selectedUsage.day]}</strong><span>전체 {selectedUsage.value}건</span><span>완료 {selectedUsage.value-6}건</span><span>실패 6건</span></div></section>

    <section className="admin-mini-section"><h2>운영 현황</h2><div className="admin-operation-grid">{[
      [ROUTES.ADMIN_AD_REWARDS,"광고 보상 이용","153건",Gift,"lavender"],
      [`${ROUTES.ADMIN_USERS}?usage=exhausted`,"분석 소진 사용자","136명",Users,"mint"],
      [`${ROUTES.ADMIN_ERRORS}?status=pending`,"처리 대기 오류","9건",AlertCircle,"coral"],
      [`${ROUTES.ADMIN_SUPPORT}?status=pending`,"답변 대기 문의","6건",MessageCircleQuestion,"peach"],
    ].map(([href,label,value,Icon,tone])=><Link key={label as string} href={href as string} className={`admin-operation-card tone-${tone}`}><span><Icon /></span><small>{label as string}</small><strong>{value as string}</strong></Link>)}</div></section>

    <section className="admin-panel admin-checklist"><h2>오늘 확인할 항목</h2>{[
      [ROUTES.ADMIN_ERRORS,"분석 실패","9건",AlertCircle], [`${ROUTES.ADMIN_ANALYSES}?status=review`,"결과 검토 요청","4건",FileSearch],
      [`${ROUTES.ADMIN_SUPPORT}?status=pending`,"답변 대기 문의","6건",CircleHelp], [`${ROUTES.ADMIN_AD_REWARDS}?status=review`,"광고 보상 확인","2건",Gift],
    ].map(([href,label,count,Icon])=><Link key={label as string} href={href as string}><span><Icon /></span><strong>{label as string}</strong><em>{count as string}</em><ChevronRight /></Link>)}</section>

    <section className="admin-mini-section"><h2>분석 품질 현황</h2><div className="admin-quality-grid">{[
      ["평균 신뢰도 점수","78점","지난주보다 2.1점 증가",ShieldCheck,"good"], ["분석 성공률","96.8%","지난주보다 0.8% 증가",Sparkles,"good"],
      ["평균 분석 시간","8.4초","지난주보다 0.6초 감소",Clock3,"good"], ["재분석 요청","14건","지난주보다 2건 증가",RefreshCw,"attention"],
    ].map(([label,value,change,Icon,tone])=><article key={label as string}><span className={tone as string}><Icon /></span><small>{label as string}</small><strong>{value as string}</strong><em>{change as string}</em></article>)}</div></section>

    <section className="admin-panel admin-departments"><h2>진료과별 분석 현황</h2><div>{DEPARTMENT_USAGE.map((item)=><Link key={item.name} href={`${ROUTES.ADMIN_ANALYSES}?department=${encodeURIComponent(item.name)}`} className={`department-${item.name}`}><span><Activity /></span><strong>{item.name}</strong><b>{item.count}건</b><small>오류 {item.errors}건</small></Link>)}</div></section>

    <section className="admin-panel admin-activity-list"><h2>최근 분석 활동</h2>{DASHBOARD_ACTIVITY.map((item)=><Link key={item.id} href={`${ROUTES.ADMIN_ANALYSES}?id=${item.id}`}><span className={`department-dot department-${item.department}`} /><div><strong>{item.department} · {item.method}</strong><small>{item.email}</small><p>{item.detail}</p></div><aside><time>{item.time}</time><em className={`admin-state activity-${item.status.replace(" ","-")}`}>{item.status}</em></aside></Link>)}</section>
  </AdminGuard></AdminAppShell>
}
