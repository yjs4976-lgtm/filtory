"use client"

import type { AdminUser, UserStatus } from "@/lib/types"
import { adminUserService } from "@/services/adminUserService"

interface AdminUserDetailCardProps {
  user: AdminUser
}

export function AdminUserDetailCard({ user }: AdminUserDetailCardProps) {
  const handleStatusChange = async (status: UserStatus) => {
    await adminUserService.updateUserStatus(user.id, status)
    window.alert("회원 상태 변경은 mock 처리되었습니다.")
  }

  return (
    <section className="soft-card admin-table-card">
      <h2>기본 정보</h2>
      <p>{user.nickname} · {user.name}</p>
      <p>{user.email}</p>
      <p>가입일 {user.createdAt ?? "-"} · 최근 로그인 {user.lastLoginAt ?? "-"}</p>
      <div className="admin-filter-grid">
        <select defaultValue={user.status} onChange={(event) => handleStatusChange(event.target.value as UserStatus)}>
          <option value="ACTIVE">정상</option>
          <option value="SUSPENDED">정지</option>
          <option value="WITHDRAWN">탈퇴</option>
          <option value="DORMANT">휴면</option>
        </select>
      </div>
    </section>
  )
}
