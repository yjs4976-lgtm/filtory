import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { AdminSampleNotice } from "@/components/admin/AdminSampleNotice"
import { AD_REWARDS } from "@/mocks/adminData"
export default function Page(){return <AdminAppShell title="광고 보상 내역"><AdminGuard><section className="page-title"><p className="eyebrow">ADMIN REWARDS</p><h1>광고 보상 내역</h1><p>광고 보상 지급 기능 연결 전 샘플 기록을 확인하세요.</p></section><AdminSampleNotice message="광고 SDK와 보상 지급·회수 API가 연결되지 않은 준비 화면이며 표시 값은 샘플입니다." /><section className="soft-card admin-table-card"><div className="table-scroll"><table className="admin-table"><thead><tr>{["사용자","지급 시각","추가 횟수","사용 여부","사용 시각","상태"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{AD_REWARDS.map((r,i)=><tr key={i}>{r.map((x,j)=><td key={`${i}-${j}`}>{x}</td>)}</tr>)}</tbody></table></div></section></AdminGuard></AdminAppShell>}
