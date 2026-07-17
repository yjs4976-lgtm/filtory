"use client"

import { useLanguage } from "@/context/LanguageContext"
import type { AdminUser, UserRole, UserStatus } from "@/lib/types"
import { calculateInternationalAge, getAgeGroup } from "@/lib/profileDemographics"
import { adminService } from "@/services/adminService"
import { adminUserService } from "@/services/adminUserService"

interface Props { user: AdminUser; onRefresh: () => void; onError: (message: string) => void }

export function AdminUserDetailCard({ user, onRefresh, onError }: Props) {
  const { t, language } = useLanguage()
  const labels = t.admin.userManagement
  const visibleStatus = user.status === "DORMANT" ? "SUSPENDED" : user.status
  const ageGroup = user.dateOfBirth ? getAgeGroup(calculateInternationalAge(user.dateOfBirth)) : null
  const text = language === "en" ? en : ko

  const run = async (action: () => Promise<unknown>) => {
    try { await action(); onRefresh() }
    catch (error) { onError(error instanceof Error ? error.message : t.admin.loadFailed) }
  }

  return <section className="soft-card admin-table-card">
    <h2>{labels.manage}</h2>
    <dl className="admin-user-detail-list">
      <Item label={text.name} value={[user.nickname, user.name].filter(Boolean).join(" · ") || "-"} />
      <Item label={text.email} value={user.email} />
      <Item label={labels.createdAt} value={user.createdAt ?? "-"} />
      <Item label={labels.lastLoginAt} value={user.lastLoginAt ?? "-"} />
      <Item label={text.birthDate} value={user.dateOfBirth ?? "-"} />
      <Item label={text.gender} value={genderLabel(user.gender, language)} />
      <Item label={text.ageGroup} value={ageLabel(ageGroup, language)} />
      <Item label={text.analysisCount} value={user.analysisCount == null ? "-" : String(user.analysisCount)} />
      <Item label={text.savedCount} value={user.savedHospitalCount == null ? "-" : String(user.savedHospitalCount)} />
      <Item label={text.reportCount} value={user.reportCount == null ? "-" : String(user.reportCount)} />
    </dl>
    <div className="admin-filter-grid">
      <label><span>{labels.role}</span><select value={user.role} onChange={(event) => void run(() => adminService.updateUserRole(user.id, event.target.value as UserRole))}><option value="USER">{labels.roleUser}</option><option value="ADMIN">{labels.roleAdmin}</option></select></label>
      <label><span>{labels.status}</span>{visibleStatus === "WITHDRAWN" ? <span className="admin-badge admin-status-withdrawn">{labels.statusWithdrawn}</span> : <select value={visibleStatus} onChange={(event) => void run(() => adminUserService.updateUserStatus(user.id, event.target.value as UserStatus))}><option value="ACTIVE">{labels.statusActive}</option><option value="SUSPENDED">{labels.statusInactive}</option></select>}</label>
    </div>
    <button type="button" className="small-danger-button admin-user-withdraw-button" disabled={visibleStatus === "WITHDRAWN"} onClick={() => { if (window.confirm(t.admin.userDeleteConfirm)) void run(() => adminService.deleteUser(user.id)) }}>{t.mypage.delete}</button>
  </section>
}

function Item({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div> }
function genderLabel(value: AdminUser["gender"], language: string) { const map = language === "en" ? { FEMALE:"Female",MALE:"Male",OTHER:"Other",PREFER_NOT_TO_SAY:"Prefer not to say" } : { FEMALE:"여성",MALE:"남성",OTHER:"기타",PREFER_NOT_TO_SAY:"응답하지 않음" }; return value ? map[value] : "-" }
function ageLabel(value: ReturnType<typeof getAgeGroup>, language: string) { if (!value) return "-"; const map = language === "en" ? { UNDER_TEN:"Under 10",TEENS:"Teens",TWENTIES:"20s",THIRTIES:"30s",FORTIES:"40s",FIFTIES:"50s",SIXTIES_OR_MORE:"60+" } : { UNDER_TEN:"10세 미만",TEENS:"10대",TWENTIES:"20대",THIRTIES:"30대",FORTIES:"40대",FIFTIES:"50대",SIXTIES_OR_MORE:"60대 이상" }; return map[value] }
const ko={name:"이름",email:"이메일",birthDate:"생년월일",gender:"성별",ageGroup:"연령대",analysisCount:"분석 횟수",savedCount:"저장 병원",reportCount:"신고 횟수"}
const en={name:"Name",email:"Email",birthDate:"Date of birth",gender:"Gender",ageGroup:"Age group",analysisCount:"Analyses",savedCount:"Saved hospitals",reportCount:"Reports"}
