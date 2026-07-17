"use client"
import { useState } from "react"
import { X } from "lucide-react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { AdminSampleNotice } from "@/components/admin/AdminSampleNotice"
import { ERROR_RECORDS } from "@/mocks/adminData"

export default function Page(){const [selected,setSelected]=useState<(typeof ERROR_RECORDS)[number]|null>(null);return <AdminAppShell title="분석 오류 관리"><AdminGuard>
  <section className="page-title"><p className="eyebrow">ADMIN ERRORS</p><h1>분석 오류 관리</h1><p>처리 대기 오류와 재시도 상태를 확인하세요.</p></section><AdminSampleNotice />
  <section className="soft-card admin-table-card"><div className="table-scroll"><table className="admin-table"><thead><tr>{["ID","오류","사용자","진료과","발생 시각","상태","관리"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{ERROR_RECORDS.map(r=><tr key={r.id}><td>{r.id}</td><td>{r.type}</td><td>{r.user}</td><td>{r.department}</td><td>{r.time}</td><td>{r.status}</td><td><button className="small-button" onClick={()=>setSelected(r)}>조회</button></td></tr>)}</tbody></table></div></section>
  {selected&&<div className="admin-drawer-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setSelected(null)}><section className="admin-user-drawer" role="dialog" aria-modal="true"><button className="admin-drawer-close" onClick={()=>setSelected(null)} aria-label="닫기"><X/></button><h2>오류 상세</h2><p>{selected.id} · {selected.type}</p><dl>{[["사용자",selected.user],["입력값",selected.input],["진료과",selected.department],["분석 방식",selected.method],["발생 시각",selected.time],["재시도",`${selected.retries}회`],["처리 상태",selected.status]].map(([a,b])=><div key={a}><dt>{a}</dt><dd>{b}</dd></div>)}</dl><div className="admin-drawer-actions">{["다시 분석","처리 완료 표시","사용자 안내 필요"].map(label=><button key={label} disabled title="백엔드 API 연결이 필요한 기능입니다">{label} · API 연결 필요</button>)}</div></section></div>}
</AdminGuard></AdminAppShell>}
