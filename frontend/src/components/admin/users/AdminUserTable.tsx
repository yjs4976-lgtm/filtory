"use client"

import Link from "next/link"
import { useLanguage } from "@/context/LanguageContext"
import type { AdminUser, UserRole, UserStatus } from "@/lib/types"
import { adminUserService } from "@/services/adminUserService"

interface AdminUserTableProps {
  users: AdminUser[]
  onRefresh?: () => void
}

const ACTIVE_STATUS: UserStatus = "ACTIVE"
const INACTIVE_STATUS: UserStatus = "SUSPENDED"
const BLOCKED_STATUS: UserStatus = "WITHDRAWN"

function formatDate(value?: string) {
  if (!value) return "-"

  const match = value.match(/^(\d{4})[-.](\d{2})[-.](\d{2})/)
  if (match) return `${match[1]}.${match[2]}.${match[3]}`

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}.${month}.${day}`
}

function visibleStatus(status: UserStatus) {
  if (status === ACTIVE_STATUS) return ACTIVE_STATUS
  if (status === BLOCKED_STATUS) return BLOCKED_STATUS
  return INACTIVE_STATUS
}

export function AdminUserTable({ users, onRefresh }: AdminUserTableProps) {
  const { t } = useLanguage()
  const labels = t.admin.userManagement

  const roleLabel = (role: UserRole) => role === "ADMIN" ? labels.roleAdmin : labels.roleUser
  const statusLabel = (status: UserStatus) => {
    const nextStatus = visibleStatus(status)
    if (nextStatus === ACTIVE_STATUS) return labels.statusActive
    if (nextStatus === BLOCKED_STATUS) return labels.statusBlocked
    return labels.statusInactive
  }
  const statusClass = (status: UserStatus) => {
    const nextStatus = visibleStatus(status)
    if (nextStatus === ACTIVE_STATUS) return "admin-status-active"
    if (nextStatus === BLOCKED_STATUS) return "admin-status-blocked"
    return "admin-status-inactive"
  }

  const handleStatusChange = async (userId: number, status: UserStatus) => {
    await adminUserService.updateUserStatus(userId, status)
    onRefresh?.()
  }

  const renderStatusSelect = (user: AdminUser) => (
    <select
      className="admin-status-select"
      value={visibleStatus(user.status)}
      aria-label={`${labels.changeStatus}: ${user.nickname || user.name || user.email}`}
      onChange={(event) => handleStatusChange(user.id, event.target.value as UserStatus)}
    >
      <option value={ACTIVE_STATUS}>{labels.statusActive}</option>
      <option value={INACTIVE_STATUS}>{labels.statusInactive}</option>
      <option value={BLOCKED_STATUS}>{labels.statusBlocked}</option>
    </select>
  )

  return (
    <section className="soft-card admin-table-card">
      <div className="admin-card-title-row">
        <h2>{labels.listTitle}</h2>
        <span>{labels.totalPrefix} {users.length}{labels.totalSuffix}</span>
      </div>

      <div className="admin-user-mobile-list">
        {users.map((user) => (
          <article key={user.id} className="admin-user-card">
            <div className="admin-user-card-header">
              <div className="admin-user-identity">
                <strong>{user.nickname || user.name || "-"}</strong>
                {user.nickname && user.name ? <span>{user.name}</span> : null}
                <a href={`mailto:${user.email}`}>{user.email}</a>
              </div>
            </div>

            <div className="admin-user-badge-row">
              <span className={`admin-badge ${statusClass(user.status)}`}>{statusLabel(user.status)}</span>
              <span className={`admin-badge ${user.role === "ADMIN" ? "admin-role-admin" : "admin-role-user"}`}>{roleLabel(user.role)}</span>
            </div>

            <dl className="admin-user-meta">
              <div>
                <dt>{labels.createdAt}</dt>
                <dd>{formatDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt>{labels.lastLoginAt}</dt>
                <dd>{formatDate(user.lastLoginAt)}</dd>
              </div>
            </dl>

            <div className="admin-user-card-actions">
              <Link href={`/admin/users/${user.id}`} className="small-button">
                {labels.viewDetail}
              </Link>
              {renderStatusSelect(user)}
            </div>
          </article>
        ))}
        {users.length === 0 && <p className="admin-user-empty">{labels.empty}</p>}
      </div>
    </section>
  )
}
