"use client"
import { useState } from "react"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { AdminSampleNotice } from "@/components/admin/AdminSampleNotice"
import { USAGE_RECORDS } from "@/mocks/adminData"
export default function Page(){const [q,setQ]=useState("");const rows=USAGE_RECORDS.filter(r=>r.join(" ").toLowerCase().includes(q.toLowerCase()));return <AdminAppShell title="분석 사용량"><AdminGuard><section className="page-title"><p className="eyebrow">ADMIN USAGE</p><h1>분석 사용량</h1><p>전체 분석 실행과 사용 유형을 확인하세요.</p></section><AdminSampleNotice /><section className="soft-card admin-table-card"><div className="admin-filter-grid"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="사용자 또는 기록 ID" /></div></section><section className="soft-card admin-table-card"><div className="table-scroll"><table className="admin-table"><thead><tr>{["기록 ID","사용자","분석 방식","진료과","사용 유형","실행 시각","상태"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((x,j)=><td key={`${i}-${j}`}>{x}</td>)}</tr>)}</tbody></table></div></section></AdminGuard></AdminAppShell>}
