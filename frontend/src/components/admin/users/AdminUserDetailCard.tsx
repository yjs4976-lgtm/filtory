"use client"

import { useLanguage } from "@/context/LanguageContext"
import type { AdminUser, UserRole, UserStatus } from "@/lib/types"
import { calculateInternationalAge, getAgeGroup } from "@/lib/profileDemographics"
import { adminService } from "@/services/adminService"
import { adminUserService, type AdminUserActivity } from "@/services/adminUserService"

interface Props { user: AdminUser; activity: AdminUserActivity; onRefresh: () => void; onError: (message: string) => void }

export function AdminUserDetailCard({ user, activity, onRefresh, onError }: Props) {
  const { t, language } = useLanguage()
  const labels = t.admin.userManagement
  const visibleStatus = user.status === "DORMANT" ? "SUSPENDED" : user.status
  const ageGroup = user.dateOfBirth ? getAgeGroup(calculateInternationalAge(user.dateOfBirth)) : null
  const text = language === "en" ? en : ko

  const run = async (action: () => Promise<unknown>) => {
    try { await action(); onRefresh() }
    catch (error) { onError(error instanceof Error ? error.message : t.admin.loadFailed) }
  }

  const displayName = [user.nickname, user.name].filter(Boolean).join(" · ") || "-"
  return <section className="soft-card admin-table-card admin-member-detail-panel">
    <header className="admin-member-profile">
      <span className="admin-member-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span>
      <div>
        <p>{labels.manage}</p>
        <h2>{displayName}</h2>
        <span>{user.email}</span>
      </div>
      <span className={`admin-badge ${visibleStatus === "ACTIVE" ? "admin-status-active" : visibleStatus === "WITHDRAWN" ? "admin-status-withdrawn" : "admin-status-inactive"}`}>
        {visibleStatus === "ACTIVE" ? labels.statusActive : visibleStatus === "WITHDRAWN" ? labels.statusWithdrawn : labels.statusInactive}
      </span>
    </header>
    <h3 className="admin-member-subtitle">{text.basicInfo}</h3>
    <dl className="admin-user-detail-list">
      <Item label={text.name} value={displayName} />
      <Item label={text.email} value={user.email} />
      <Item label={labels.createdAt} value={formatDate(user.createdAt ?? null)} />
      <Item label={labels.lastLoginAt} value={formatDate(user.lastLoginAt ?? null)} />
      <Item label={text.birthDate} value={user.dateOfBirth ?? "-"} />
      <Item label={text.gender} value={genderLabel(user.gender, language)} />
      <Item label={text.ageGroup} value={ageLabel(ageGroup, language)} />
      <Item label={text.analysisCount} value={user.analysisCount == null ? "-" : String(user.analysisCount)} />
      <Item label={text.savedCount} value={user.savedHospitalCount == null ? "-" : String(user.savedHospitalCount)} />
      <Item label={text.reportCount} value={user.reportCount == null ? "-" : String(user.reportCount)} />
    </dl>
    <h3 className="admin-member-subtitle">{text.operationStatus}</h3>
    <div className="admin-filter-grid admin-member-operation-grid">
      <label><span>{labels.role}</span><select value={user.role} onChange={(event) => void run(() => adminService.updateUserRole(user.id, event.target.value as UserRole))}><option value="USER">{labels.roleUser}</option><option value="ADMIN">{labels.roleAdmin}</option></select></label>
      <label><span>{labels.status}</span>{visibleStatus === "WITHDRAWN" ? <span className="admin-badge admin-status-withdrawn">{labels.statusWithdrawn}</span> : <select value={visibleStatus} onChange={(event) => void run(() => adminUserService.updateUserStatus(user.id, event.target.value as UserStatus))}><option value="ACTIVE">{labels.statusActive}</option><option value="SUSPENDED">{labels.statusInactive}</option></select>}<small>{visibleStatus === "ACTIVE" ? text.activeHint : visibleStatus === "WITHDRAWN" ? text.readonlyHint : text.suspendedHint}</small></label>
    </div>
    <p className="admin-management-note">{visibleStatus === "WITHDRAWN" ? text.withdrawnReadonly : labels.statusPolicy}</p>

    <div className="admin-activity-summary">
      <h3>{t.admin.activityTitle}</h3>
      <div className="admin-activity-counts">
        <ActivityCount label={t.admin.activityAnalysis} value={activity.counts.analyses} />
        <ActivityCount label={t.admin.activitySaved} value={activity.counts.savedHospitals} />
        <ActivityCount label={t.admin.activityReports} value={activity.counts.reports} />
      </div>
      <ActivitySection title={t.admin.activityAnalysis} empty={text.noAnalyses}>
        {activity.analysisHistory.map((item) => <li key={item.requestId}><strong>{item.hospitalName}</strong><span>{item.status} · {formatDate(item.createdAt)}</span></li>)}
      </ActivitySection>
      <ActivitySection title={t.admin.activitySaved} empty={text.noSaved}>
        {activity.savedHospitals.map((item) => <li key={`${item.hospitalId}-${item.savedAt}`}><strong>{item.hospitalName}</strong><span>{item.category ?? "-"} · {formatDate(item.savedAt)}</span></li>)}
      </ActivitySection>
      <ActivitySection title={t.admin.activityReports} empty={text.noReports}>
        {activity.reports.map((item) => <li key={item.id}><strong>{item.hospitalName ?? "-"}</strong><span>{item.type} · {item.status} · {formatDate(item.createdAt)}</span></li>)}
      </ActivitySection>
    </div>
  </section>
}

function Item({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div> }
function ActivityCount({ label, value }: { label: string; value: number }) { return <div><span>{label}</span><strong>{value}</strong></div> }
function ActivitySection({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children]
  return <section className="admin-member-activity-section"><h4>{title}</h4>{items.length > 0 ? <ul>{children}</ul> : <p>{empty}</p>}</section>
}
function formatDate(value: string | null) { return value ? value.slice(0, 10).replaceAll("-", ".") : "-" }
function genderLabel(value: AdminUser["gender"], language: string) { const map = language === "en" ? { FEMALE:"Female",MALE:"Male",OTHER:"Other",PREFER_NOT_TO_SAY:"Prefer not to say" } : { FEMALE:"여성",MALE:"남성",OTHER:"기타",PREFER_NOT_TO_SAY:"응답하지 않음" }; return value ? map[value] : "-" }
function ageLabel(value: ReturnType<typeof getAgeGroup>, language: string) { if (!value) return "-"; const map = language === "en" ? { UNDER_TEN:"Under 10",TEENS:"Teens",TWENTIES:"20s",THIRTIES:"30s",FORTIES:"40s",FIFTIES:"50s",SIXTIES_OR_MORE:"60+" } : { UNDER_TEN:"10세 미만",TEENS:"10대",TWENTIES:"20대",THIRTIES:"30대",FORTIES:"40대",FIFTIES:"50대",SIXTIES_OR_MORE:"60대 이상" }; return map[value] }
const ko={basicInfo:"기본 정보",operationStatus:"운영 상태",name:"이름",email:"이메일",birthDate:"생년월일",gender:"성별",ageGroup:"연령대",analysisCount:"분석 횟수",savedCount:"저장 병원",reportCount:"신고 횟수",activeHint:"서비스 이용 가능",suspendedHint:"로그인 차단 · 다시 활성화 가능",readonlyHint:"읽기 전용",withdrawnReadonly:"탈퇴 회원은 기존 기록만 조회할 수 있어요.",noAnalyses:"최근 분석 기록이 없습니다.",noSaved:"최근 저장 병원이 없습니다.",noReports:"최근 검토 요청이 없습니다."}
const en={basicInfo:"Basic information",operationStatus:"Account status",name:"Name",email:"Email",birthDate:"Date of birth",gender:"Gender",ageGroup:"Age group",analysisCount:"Analyses",savedCount:"Saved hospitals",reportCount:"Reports",activeHint:"Service available",suspendedHint:"Login blocked · Can be reactivated",readonlyHint:"Read-only",withdrawnReadonly:"Withdrawn members are read-only.",noAnalyses:"No recent analyses.",noSaved:"No recently saved hospitals.",noReports:"No recent reports."}
