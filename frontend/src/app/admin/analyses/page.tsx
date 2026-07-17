"use client"
import { useMemo, useState } from "react"
import { X } from "lucide-react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { AdminSampleNotice } from "@/components/admin/AdminSampleNotice"
import { ADMIN_DEPARTMENTS, ANALYSIS_RECORDS } from "@/mocks/adminData"

export default function Page() {
  const [query,setQuery]=useState(""); const [department,setDepartment]=useState("전체"); const [status,setStatus]=useState("전체"); const [selected,setSelected]=useState<(typeof ANALYSIS_RECORDS)[number]|null>(null)
  const rows=useMemo(()=>ANALYSIS_RECORDS.filter(r=>(!query||`${r.id} ${r.user} ${r.input}`.toLowerCase().includes(query.toLowerCase()))&&(department==="전체"||r.department===department)&&(status==="전체"||r.status===status)),[query,department,status])
  return <AdminAppShell title="분석 결과 관리"><AdminGuard>
    <section className="page-title"><p className="eyebrow">ADMIN ANALYSES</p><h1>분석 결과 관리</h1><p>분석 품질과 검토가 필요한 결과를 확인하세요.</p></section>
    <AdminSampleNotice />
    <section className="soft-card admin-table-card"><div className="admin-filter-grid"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="분석 ID, 사용자, 입력값" /><select value={department} onChange={e=>setDepartment(e.target.value)}><option>전체</option>{ADMIN_DEPARTMENTS.map(x=><option key={x}>{x}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)}>{["전체","완료","분석 중","실패","검토 필요","재분석 중"].map(x=><option key={x}>{x}</option>)}</select></div></section>
    <section className="soft-card admin-table-card"><div className="table-scroll"><table className="admin-table"><thead><tr>{["ID","사용자","진료과","분석 방식","점수","상태","관리"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.id}</td><td>{r.user}</td><td>{r.department}</td><td>{r.method}</td><td>{r.score || "-"}</td><td>{r.status}</td><td><button className="small-button" onClick={()=>setSelected(r)}>조회</button></td></tr>)}</tbody></table></div></section>
    {selected&&<div className="admin-drawer-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setSelected(null)}><section className="admin-user-drawer" role="dialog" aria-modal="true"><button className="admin-drawer-close" onClick={()=>setSelected(null)} aria-label="닫기"><X/></button><h2>분석 상세</h2><p>{selected.id} · {selected.user}</p><dl>{[["입력값",selected.input],["진료과",selected.department],["분석 방식",selected.method],["분석 시각",selected.time],["리뷰 신뢰도",`${selected.score}점`],["상태",selected.status]].map(([a,b])=><div key={a}><dt>{a}</dt><dd>{b}</dd></div>)}</dl><div className="admin-drawer-actions">{["다시 분석","검토 필요 표시","정상 결과 확인","메모 저장"].map(label=><button key={label} disabled title="백엔드 API 연결이 필요한 기능입니다">{label} · API 연결 필요</button>)}</div></section></div>}
  </AdminGuard></AdminAppShell>
}
