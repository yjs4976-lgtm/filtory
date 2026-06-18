"use client"

import { useCallback, useEffect, useState } from "react"
import type { AdminUser } from "@/lib/types"
import { adminUserService, type AdminUserFilters } from "@/services/adminUserService"
import { AdminUserFilter } from "@/components/admin/users/AdminUserFilter"
import { AdminUserTable } from "@/components/admin/users/AdminUserTable"

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [filters, setFilters] = useState<AdminUserFilters>({ status: "all", role: "all" })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")

      const nextUsers = await adminUserService.getUsers(filters)
      setUsers(nextUsers)
    } catch (error) {
      setError(error instanceof Error ? error.message : "관리자 데이터 조회 실패")
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadData])

  return (
    <main className="page admin-page">
      <section className="page-title">
        <p className="eyebrow">ADMIN USERS</p>
        <h1>회원 관리</h1>
        <p>회원 목록, 권한, 계정 상태를 관리합니다.</p>
      </section>

      {isLoading && <p>불러오는 중...</p>}
      {error && <p className="form-error">{error}</p>}
      <AdminUserFilter value={filters} onChange={setFilters} />
      {!isLoading && <AdminUserTable users={users} />}
    </main>
  )
}
