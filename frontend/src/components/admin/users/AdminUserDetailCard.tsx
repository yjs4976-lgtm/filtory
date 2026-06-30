"use client"

import type { AdminUser, UserStatus } from "@/lib/types"
import { adminUserService } from "@/services/adminUserService"

interface AdminUserDetailCardProps {
  user: AdminUser
}

export function AdminUserDetailCard({ user }: AdminUserDetailCardProps) {
  const handleStatusChange = async (status: UserStatus) => {
    await adminUserService.updateUserStatus(user.id, status)
  }
  const visibleStatus = user.status === "DORMANT" ? "SUSPENDED" : user.status

  return (
    <section className="soft-card admin-table-card">
      <h2>기본 정보</h2>
      <p>{user.nickname} · {user.name}</p>
      <p>{user.email}</p>
      <p>가입일 {user.createdAt ?? "-"} · 최근 로그인 {user.lastLoginAt ?? "-"}</p>
      <div className="admin-filter-grid">
        <select defaultValue={visibleStatus} onChange={(event) => handleStatusChange(event.target.value as UserStatus)}>
          <option value="ACTIVE">활성</option>
          <option value="SUSPENDED">비활성</option>
          <option value="WITHDRAWN">차단</option>
        </select>
      </div>
    </section>
  )
}
