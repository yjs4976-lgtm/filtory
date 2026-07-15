"use client"

import { useEffect, useState } from "react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { useToast } from "@/hooks/useToast"
import { setWorkspaceDirty } from "@/lib/workspace"
import { ADMIN_DEPARTMENTS } from "@/mocks/adminData"

export default function AdminSettingsPage() {
  const [confirm, setConfirm] = useState(false)
  const [dirty, setDirty] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    setWorkspaceDirty(dirty)
    return () => setWorkspaceDirty(false)
  }, [dirty])

  useEffect(() => {
    if (!confirm) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") setConfirm(false) }
    window.addEventListener("keydown", keydown)
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", keydown) }
  }, [confirm])

  const save = () => {
    setConfirm(false)
    setDirty(false)
    showToast({ title: "서비스 설정이 저장되었습니다.", tone: "success" })
  }

  return <AdminAppShell title="서비스 설정"><AdminGuard>
    <div className="admin-heading"><h2>서비스 설정</h2><p>분석 이용 정책과 지원 범위를 mock 상태로 관리하세요.</p></div>
    <div onChange={() => setDirty(true)}>
      <section className="admin-panel admin-settings-form"><h3>분석 이용 설정</h3>{[
        ["Free 월간 상세 분석 횟수", 5], ["Plus 월간 상세 분석 횟수", 30], ["무료 상세 분석 초기화일", 1], ["광고 보상 추가 횟수", 1], ["사용자별 일일 광고 보상 제한", 1],
      ].map(([label, value]) => <label key={label}><span>{label}</span><input type="number" defaultValue={value} /></label>)}</section>
      <section className="admin-panel admin-settings-form"><h3>지원 진료과</h3><div className="admin-department-settings">{ADMIN_DEPARTMENTS.map((department) => <label key={department}><input type="checkbox" defaultChecked /><span>{department}</span></label>)}</div></section>
      <section className="admin-panel admin-settings-form"><h3>분석 운영 설정</h3>
        <label><span>분석 제한 시간(초)</span><input type="number" defaultValue={30} /></label>
        <label><span>자동 재시도 횟수</span><input type="number" defaultValue={2} /></label>
        <label><span>URL 분석 지원</span><select defaultValue="사용"><option>사용</option><option>사용 안 함</option></select></label>
        <label><span>지원 URL 사이트</span><input defaultValue="네이버 플레이스" /></label>
        <button type="button" onClick={() => setConfirm(true)}>설정 저장</button>
      </section>
    </div>
    {confirm && <div className="admin-confirm-backdrop"><section className="admin-confirm" role="alertdialog" aria-modal="true"><h2>서비스 이용 설정을 변경할까요?</h2><p>변경 내용은 새로 가입하거나 다음 달 초기화되는 사용자부터 적용될 수 있어요.</p><div><button onClick={() => setConfirm(false)}>취소</button><button onClick={save}>저장</button></div></section></div>}
  </AdminGuard></AdminAppShell>
}
