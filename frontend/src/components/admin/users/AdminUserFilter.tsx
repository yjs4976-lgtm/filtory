"use client"

import type { UserRole, UserStatus } from "@/lib/types"
import type { AdminUserFilters } from "@/services/adminUserService"

interface AdminUserFilterProps {
  value: AdminUserFilters
  onChange: (value: AdminUserFilters) => void
}

export function AdminUserFilter({ value, onChange }: AdminUserFilterProps) {
  return (
    <section className="soft-card admin-table-card">
      <h2>회원 검색</h2>
      <div className="admin-filter-grid">
        <input
          value={value.keyword ?? ""}
          placeholder="이름 / 닉네임 / 이메일 검색"
          onChange={(event) => onChange({ ...value, keyword: event.target.value })}
        />
        <select value={value.status ?? "all"} onChange={(event) => onChange({ ...value, status: event.target.value as "all" | UserStatus })}>
          <option value="all">상태 전체</option>
          <option value="ACTIVE">정상</option>
          <option value="SUSPENDED">정지</option>
          <option value="WITHDRAWN">탈퇴</option>
          <option value="DORMANT">휴면</option>
        </select>
        <select value={value.role ?? "all"} onChange={(event) => onChange({ ...value, role: event.target.value as "all" | UserRole })}>
          <option value="all">권한 전체</option>
          <option value="USER">일반 사용자</option>
          <option value="ADMIN">관리자</option>
        </select>
      </div>
    </section>
  )
}
