"use client"

import { useMemo, useState } from "react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { ADMIN_USERS } from "@/mocks/adminData"

const statuses = ["전체", "Free", "이용 중", "해지 예정", "유예 기간", "결제 대기", "결제 보류", "만료", "환불", "검증 필요"]

export default function AdminMembershipsPage() {
  const [status, setStatus] = useState("전체")
  const users = useMemo(() => ADMIN_USERS.filter((user) => status === "전체" || (status === "Free" ? user.plan === "Free" : user.membershipStatus === status)), [status])
  return <AdminAppShell title="멤버십 관리"><AdminGuard>
    <div className="admin-heading admin-memberships-heading"><h2>결제·구독 상태</h2><p>서버 entitlement 기준으로 플랜과 이용 기간을 확인하세요.</p><span className="admin-state state-warning">개발용 mock 상태</span></div>
    <div className="admin-compact-kpis admin-membership-kpis">{[["Free 이용자","1,161명"],["Plus 이용자","87명"],["해지 예정","4명"],["검증 필요","2명"]].map((item) => <article key={item[0]}><span>{item[0]}</span><strong>{item[1]}</strong></article>)}</div>
    <div className="admin-toolbar"><label><span>구독 상태</span><select value={status} onChange={(event) => setStatus(event.target.value)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label></div>
    <section className="admin-panel admin-memberships-panel"><div className="admin-table-wrap"><table className="admin-data-table"><thead><tr>{["사용자","플랜","결제 플랫폼","구독 상태","상품 ID","이용 기간 종료","마지막 검증","상세 분석 사용량","광고 보상","남은 횟수"].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{users.map((user) => {
      const isPlus = user.plan === "Plus"; const provider = isPlus ? "Google Play" : "-"; const product = isPlus ? "filtory_plus_monthly" : "-"; const available = user.monthlyLimit + user.rewardCount
      return <tr key={user.id}><td>{user.name}<small>{user.id}</small></td><td><span className={`admin-state plan-${user.plan}`}>{user.plan}</span></td><td>{provider}</td><td><span className={`admin-state membership-${user.membershipStatus.replace(" ", "-")}`}>{user.plan === "Free" ? "Free" : user.membershipStatus}</span></td><td>{product}</td><td>{user.nextBillingDate ?? "-"}</td><td>{isPlus ? "2026-07-16 14:30" : "-"}</td><td>{user.usedCount} / {available}회</td><td>{user.rewardCount}회</td><td>{Math.max(available - user.usedCount, 0)}회</td></tr>
    })}</tbody></table></div></section>
  </AdminGuard></AdminAppShell>
}
