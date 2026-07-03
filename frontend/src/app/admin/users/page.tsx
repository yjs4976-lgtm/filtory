"use client"

import { useCallback, useEffect, useState } from "react"
import type { AdminUser } from "@/lib/types"
import { useLanguage } from "@/context/LanguageContext"
import { adminUserService, type AdminUserFilters } from "@/services/adminUserService"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { AdminUserFilter } from "@/components/admin/users/AdminUserFilter"
import { AdminUserTable } from "@/components/admin/users/AdminUserTable"

export default function AdminUsersPage() {
  const { t } = useLanguage()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [filters, setFilters] = useState<AdminUserFilters>({ status: "all", role: "all" })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const paginationResetKey = `${filters.keyword ?? ""}|${filters.status ?? "all"}|${filters.role ?? "all"}`

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")

      const nextUsers = await adminUserService.getUsers(filters)
      setUsers(nextUsers)
    } catch (error) {
      setError(error instanceof Error ? error.message : t.admin.loadFailed)
    } finally {
      setIsLoading(false)
    }
  }, [filters, t.admin.loadFailed])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadData])

  return (
    <AdminAppShell title={t.admin.users}>
      <AdminGuard>
        <section className="page-title">
          <p className="eyebrow">ADMIN USERS</p>
          <h1>{t.admin.menuUsersTitle}</h1>
          <p>{t.admin.usersDescription}</p>
        </section>

        {isLoading && <p>{t.admin.loading}</p>}
        {error && <p className="form-error">{error}</p>}
        <AdminUserFilter value={filters} onChange={setFilters} />
        {!isLoading && (
          <AdminUserTable
            key={paginationResetKey}
            users={users}
            onRefresh={loadData}
          />
        )}
      </AdminGuard>
    </AdminAppShell>
  )
}
