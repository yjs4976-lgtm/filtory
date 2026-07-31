import { AdminAppShell } from "./AdminAppShell"
import { AdminGuard } from "./AdminGuard"
import { AdminSampleNotice } from "./AdminSampleNotice"

export function AdminSimplePage({ title, description, summary, headers, rows }: { title: string; description: string; summary: Array<[string, string]>; headers: string[]; rows: string[][] }) {
  return <AdminAppShell title={title}><AdminGuard>
    <section className="page-title"><p className="eyebrow">ADMIN</p><h1>{title}</h1><p>{description}</p></section>
    <AdminSampleNotice />
    <div className="admin-summary-grid">{summary.map(([label, value]) => <article className="soft-card" key={label}><p>{label}</p><strong>{value}</strong></article>)}</div>
    <section className="soft-card admin-table-card"><div className="table-scroll"><table className="admin-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div></section>
  </AdminGuard></AdminAppShell>
}
