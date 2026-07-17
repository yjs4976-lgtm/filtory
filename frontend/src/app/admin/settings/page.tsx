"use client"

import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { AdminSampleNotice } from "@/components/admin/AdminSampleNotice"
import { ADMIN_DEPARTMENTS } from "@/mocks/adminData"

export default function AdminSettingsPage() {
  return <AdminAppShell title="서비스 설정"><AdminGuard>
    <section className="page-title"><p className="eyebrow">ADMIN SETTINGS</p><h1>서비스 설정</h1><p>분석 이용 정책과 지원 범위를 확인하세요.</p></section>
    <AdminSampleNotice message="설정 저장 API가 없어 현재 값은 조회용 샘플이며 변경할 수 없습니다." />
    <section className="soft-card admin-table-card admin-readonly-settings"><h2>분석 이용 설정</h2>{[
      ["Free 월간 상세 분석 횟수", 5], ["Plus 월간 상세 분석 횟수", 30], ["무료 상세 분석 초기화일", 1], ["광고 보상 추가 횟수", 1], ["사용자별 일일 광고 보상 제한", 1],
    ].map(([label, value]) => <label key={label}><span>{label}</span><input type="number" value={value} disabled readOnly /></label>)}</section>
    <section className="soft-card admin-table-card admin-readonly-settings"><h2>지원 진료과</h2>{ADMIN_DEPARTMENTS.map((department) => <label key={department}><input type="checkbox" checked disabled readOnly /><span>{department}</span></label>)}</section>
    <button type="button" className="small-button" disabled title="백엔드 API 연결이 필요한 기능입니다">백엔드 API 연결 필요</button>
  </AdminGuard></AdminAppShell>
}
