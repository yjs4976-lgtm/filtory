"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useLanguage } from "@/context/LanguageContext"
import type { AdminUser, UserRole, UserStatus } from "@/lib/types"
import { adminUserService } from "@/services/adminUserService"
import { adminService } from "@/services/adminService"

interface AdminUserTableProps {
  users: AdminUser[]
  onRefresh?: () => void
  onError?: (message: string) => void
}

const ACTIVE_STATUS: UserStatus = "ACTIVE"
const INACTIVE_STATUS: UserStatus = "SUSPENDED"
const WITHDRAWN_STATUS: UserStatus = "WITHDRAWN"
const PAGE_SIZE_OPTIONS = [5, 10, 20] as const

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
  if (status === WITHDRAWN_STATUS) return WITHDRAWN_STATUS
  return INACTIVE_STATUS
}

export function AdminUserTable({ users, onRefresh, onError }: AdminUserTableProps) {
  const { t } = useLanguage()
  const labels = t.admin.userManagement
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(5)
  const totalPages = Math.max(1, Math.ceil(users.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const rangeStart = users.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(safeCurrentPage * pageSize, users.length)
  const paginatedUsers = useMemo(
    () => users.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize),
    [pageSize, safeCurrentPage, users]
  )

  const roleLabel = (role: UserRole) => role === "ADMIN" ? labels.roleAdmin : labels.roleUser
  const statusLabel = (status: UserStatus) => {
    const nextStatus = visibleStatus(status)
    if (nextStatus === ACTIVE_STATUS) return labels.statusActive
    if (nextStatus === WITHDRAWN_STATUS) return labels.statusWithdrawn
    return labels.statusInactive
  }
  const statusClass = (status: UserStatus) => {
    const nextStatus = visibleStatus(status)
    if (nextStatus === ACTIVE_STATUS) return "admin-status-active"
    if (nextStatus === WITHDRAWN_STATUS) return "admin-status-withdrawn"
    return "admin-status-inactive"
  }

  const handleStatusChange = async (userId: number, status: UserStatus) => {
    try {
      await adminUserService.updateUserStatus(userId, status)
      onRefresh?.()
    } catch (error) {
      onError?.(error instanceof Error ? error.message : t.admin.loadFailed)
    }
  }

  const handleRoleChange = async (userId: number, role: UserRole) => {
    try {
      await adminService.updateUserRole(userId, role)
      onRefresh?.()
    } catch (error) {
      onError?.(error instanceof Error ? error.message : t.admin.loadFailed)
    }
  }

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number])
    setCurrentPage(1)
  }

  const renderStatusControl = (user: AdminUser) => {
    if (visibleStatus(user.status) === WITHDRAWN_STATUS) {
      return <span className="admin-badge admin-status-withdrawn">{labels.statusWithdrawn}</span>
    }

    return (
      <select
        className="admin-status-select"
        value={visibleStatus(user.status)}
        aria-label={`${labels.changeStatus}: ${user.nickname || user.name || user.email}`}
        onChange={(event) => handleStatusChange(user.id, event.target.value as UserStatus)}
      >
        <option value={ACTIVE_STATUS}>{labels.statusActive}</option>
        <option value={INACTIVE_STATUS}>{labels.statusInactive}</option>
      </select>
    )
  }

  return (
    <section className="soft-card admin-table-card admin-member-list-panel">
      <div className="admin-card-title-row">
        <h2>{labels.listTitle}</h2>
        <span>{labels.totalPrefix} {users.length}{labels.totalSuffix}</span>
      </div>
      <p className="admin-management-note">{labels.statusPolicy}</p>

      <div className="admin-user-mobile-list">
        {paginatedUsers.map((user) => (
          <article key={user.id} className={`admin-user-card admin-user-card-${visibleStatus(user.status).toLowerCase()}`}>
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
              {renderStatusControl(user)}
            </div>
            <div className="admin-user-card-actions">
              <select className="admin-status-select" value={user.role} aria-label={`${labels.role}: ${user.email}`} onChange={(event) => handleRoleChange(user.id, event.target.value as UserRole)}>
                <option value="USER">{labels.roleUser}</option>
                <option value="ADMIN">{labels.roleAdmin}</option>
              </select>
            </div>
          </article>
        ))}
        {users.length === 0 && <p className="admin-user-empty">{labels.empty}</p>}
      </div>

      {users.length > 0 ? (
        <div className="admin-pagination-area" aria-label={labels.paginationLabel}>
          <div className="admin-pagination-controls">
            <button
              type="button"
              className="admin-pagination-button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              {labels.previousPage}
            </button>
            <span className="admin-pagination-info">{safeCurrentPage} / {totalPages}</span>
            <button
              type="button"
              className="admin-pagination-button admin-pagination-button-primary"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              {labels.nextPage}
            </button>
          </div>
          <select
            className="admin-page-size-select"
            value={pageSize}
            aria-label={labels.pageSizeLabel}
            onChange={(event) => handlePageSizeChange(event.target.value)}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {labels.perPage.replace("{count}", String(option))}
              </option>
            ))}
          </select>
          <p className="admin-pagination-range">
            {rangeStart}-{rangeEnd} / {users.length}{labels.totalSuffix}
          </p>
        </div>
      ) : null}
    </section>
  )
}
