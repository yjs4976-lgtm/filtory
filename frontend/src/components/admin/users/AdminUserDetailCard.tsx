"use client"

import { useLanguage } from "@/context/LanguageContext"
import type { AdminUser, UserStatus } from "@/lib/types"
import { adminUserService } from "@/services/adminUserService"

interface AdminUserDetailCardProps {
  user: AdminUser
}

export function AdminUserDetailCard({ user }: AdminUserDetailCardProps) {
  const { t } = useLanguage()
  const labels = t.admin.userManagement
  const handleStatusChange = async (status: UserStatus) => {
    await adminUserService.updateUserStatus(user.id, status)
  }
  const visibleStatus = user.status === "DORMANT" ? "SUSPENDED" : user.status

  return (
    <section className="soft-card admin-table-card">
      <h2>{labels.manage}</h2>
      <p>{user.nickname} · {user.name}</p>
      <p>{user.email}</p>
      <p>{labels.createdAt} {user.createdAt ?? "-"} · {labels.lastLoginAt} {user.lastLoginAt ?? "-"}</p>
      <div className="admin-filter-grid">
        {visibleStatus === "WITHDRAWN" ? (
          <span className="admin-badge admin-status-withdrawn">{labels.statusWithdrawn}</span>
        ) : (
          <select defaultValue={visibleStatus} onChange={(event) => handleStatusChange(event.target.value as UserStatus)}>
            <option value="ACTIVE">{labels.statusActive}</option>
            <option value="SUSPENDED">{labels.statusInactive}</option>
          </select>
        )}
      </div>
    </section>
  )
}
