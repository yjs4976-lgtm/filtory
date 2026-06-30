"use client"

import { useLanguage } from "@/context/LanguageContext"
import type { UserRole, UserStatus } from "@/lib/types"
import type { AdminUserFilters } from "@/services/adminUserService"

interface AdminUserFilterProps {
  value: AdminUserFilters
  onChange: (value: AdminUserFilters) => void
}

export function AdminUserFilter({ value, onChange }: AdminUserFilterProps) {
  const { t } = useLanguage()
  const labels = t.admin.userManagement

  return (
    <section className="soft-card admin-table-card">
      <h2>{labels.searchTitle}</h2>
      <div className="admin-filter-grid">
        <input
          value={value.keyword ?? ""}
          placeholder={labels.searchPlaceholder}
          onChange={(event) => onChange({ ...value, keyword: event.target.value })}
        />
        <select value={value.status ?? "all"} onChange={(event) => onChange({ ...value, status: event.target.value as "all" | UserStatus })}>
          <option value="all">{labels.statusAll}</option>
          <option value="ACTIVE">{labels.statusActive}</option>
          <option value="SUSPENDED">{labels.statusInactive}</option>
          <option value="WITHDRAWN">{labels.statusBlocked}</option>
        </select>
        <select value={value.role ?? "all"} onChange={(event) => onChange({ ...value, role: event.target.value as "all" | UserRole })}>
          <option value="all">{labels.roleAll}</option>
          <option value="ADMIN">{labels.roleAdmin}</option>
          <option value="USER">{labels.roleUser}</option>
        </select>
      </div>
    </section>
  )
}
