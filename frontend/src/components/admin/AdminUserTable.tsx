"use client"

import { useLanguage } from "@/context/LanguageContext"
import type { AdminUser, UserRole, UserStatus } from "@/lib/types"
import { adminService } from "@/services/adminService"

interface AdminUserTableProps {
  users: AdminUser[]
  onRefresh: () => void
}

export function AdminUserTable({ users, onRefresh }: AdminUserTableProps) {
  const { t } = useLanguage()
  const labels = t.admin.userManagement

  const handleRoleChange = async (userId: number, role: UserRole) => {
    await adminService.updateUserRole(userId, role)
    onRefresh()
  }

  const handleStatusChange = async (userId: number, status: UserStatus) => {
    await adminService.updateUserStatus(userId, status)
    onRefresh()
  }

  return (
    <section className="soft-card admin-table-card">
      <h2>{t.admin.menuUsersTitle}</h2>

      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{labels.name}</th>
              <th>{labels.email}</th>
              <th>{t.admin.provider}</th>
              <th>{labels.role}</th>
              <th>{labels.status}</th>
              <th>{labels.createdAt}</th>
              <th>{labels.manage}</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.provider || "local"}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(event) => handleRoleChange(user.id, event.target.value as UserRole)}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td>
                  {user.status === "WITHDRAWN" ? (
                    <span className="admin-badge admin-status-withdrawn">WITHDRAWN</span>
                  ) : (
                    <select
                      value={user.status === "ACTIVE" ? "ACTIVE" : "SUSPENDED"}
                      onChange={(event) => handleStatusChange(user.id, event.target.value as UserStatus)}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  )}
                </td>
                <td>{user.createdAt?.slice(0, 10) || "-"}</td>
                <td>
                  {labels.viewDetail}
                </td>
              </tr>
            ))}

            {users.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-cell">
                  {labels.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
