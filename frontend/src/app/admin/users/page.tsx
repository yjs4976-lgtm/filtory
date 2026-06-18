"use client"

import { useCallback, useEffect, useState } from "react"
import type { AdminSummary, AdminUser } from "@/lib/types"
import { adminService } from "@/services/adminService"
import { AdminSummaryCards } from "@/components/admin/AdminSummaryCards"
import { AdminUserTable } from "@/components/admin/AdminUserTable"

export default function AdminUsersPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")

      const [summaryResult, usersResult] = await Promise.all([
        adminService.getSummary(),
        adminService.getUsers(),
      ])

      setSummary(summaryResult.data)
      setUsers(usersResult.data)
    } catch (error) {
      setError(error instanceof Error ? error.message : "관리자 데이터 조회 실패")
    } finally {
      setIsLoading(false)
    }
  }, [])

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
      {!isLoading && summary && <AdminSummaryCards summary={summary} />}
      {!isLoading && <AdminUserTable users={users} onRefresh={loadData} />}
    </main>
  )
}
