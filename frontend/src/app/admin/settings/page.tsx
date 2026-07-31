"use client"

import { useEffect, useState } from "react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { useLanguage } from "@/context/LanguageContext"
import { adminSettingsService, type AdminSettings } from "@/services/adminSettingsService"

const CATEGORY_LABELS: Record<string, string> = {
  dermatology: "피부과", ophthalmology: "안과", dentistry: "치과", orthopedics: "정형외과",
}

export default function AdminSettingsPage() {
  const { t } = useLanguage()
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true
    adminSettingsService.getSettings()
      .then((data) => { if (alive) setSettings(data) })
      .catch((loadError) => { if (alive) setError(loadError instanceof Error ? loadError.message : t.admin.loadFailed) })
      .finally(() => { if (alive) setIsLoading(false) })
    return () => { alive = false }
  }, [t.admin.loadFailed])

  return <AdminAppShell title="서비스 설정"><AdminGuard>
    <section className="page-title"><p className="eyebrow">ADMIN SETTINGS</p><h1>서비스 설정</h1><p>현재 화면은 서버 정책 조회용입니다.</p></section>
    <p className="admin-unlimited-note">설정 변경 API는 아직 연결하지 않았어요. 실제 결제 검증 전에는 플랜 정책을 조회만 합니다.</p>
    {isLoading && <p>{t.admin.loading}</p>}{error && <p className="form-error">{error}</p>}
    {settings && <>
      <section className="soft-card admin-table-card admin-readonly-settings"><h2>분석 이용 정책</h2>{[
        ["Free 월간 상세 분석 횟수", settings.usagePolicy.freeMonthlyLimit],
        ["Plus mock 월간 상세 분석 횟수", settings.usagePolicy.plusMockMonthlyLimit],
        ["사용 기간 기준", settings.usagePolicy.periodBasis],
        ["사용 유형", settings.usagePolicy.usageTypes.join(", ")],
      ].map(([label, value]) => <label key={label}><span>{label}</span><input value={value} disabled readOnly /></label>)}</section>
      <section className="soft-card admin-table-card admin-readonly-settings"><h2>지원 진료과</h2>{settings.supportedCategories.map((category) => <label key={category}><input type="checkbox" checked disabled readOnly /><span>{CATEGORY_LABELS[category] ?? category}</span></label>)}</section>
      <section className="soft-card admin-table-card"><h2>플랜 정책</h2><div className="table-scroll"><table className="admin-table"><thead><tr><th>코드</th><th>이름</th><th>월 가격</th><th>월 분석 한도</th><th>활성</th></tr></thead><tbody>{settings.plans.map((plan) => <tr key={plan.planCode}><td>{plan.planCode}</td><td>{plan.planName}</td><td>{plan.monthlyPrice}</td><td>{plan.monthlyAnalysisLimit ?? "제한 없음"}</td><td>{plan.active ? "활성" : "비활성"}</td></tr>)}{settings.plans.length === 0 && <tr><td colSpan={5} className="empty-cell">등록된 플랜 정책이 없습니다.</td></tr>}</tbody></table></div></section>
    </>}
  </AdminGuard></AdminAppShell>
}
