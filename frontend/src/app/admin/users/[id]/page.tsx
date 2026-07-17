"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import type { AdminUser } from "@/lib/types"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { adminUserService } from "@/services/adminUserService"
import { AdminUserDetailCard } from "@/components/admin/users/AdminUserDetailCard"

export default function AdminUserDetailPage() {
  const { t } = useLanguage()
  const params = useParams<{ id: string }>()
  const userId = Number(params.id)
  const [user, setUser] = useState<AdminUser | null>(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const loadUser = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")
      setUser(await adminUserService.getUserDetail(userId))
    } catch (error) {
      setError(error instanceof Error ? error.message : t.admin.loadFailed)
    } finally {
      setIsLoading(false)
    }
  }, [t.admin.loadFailed, userId])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadUser() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadUser])

  return (
    <AdminAppShell title={t.admin.userDetailTitle}>
      <AdminGuard>
        <section className="page-title">
          <p className="eyebrow">ADMIN USER DETAIL</p>
          <h1>{t.admin.userDetailTitle}</h1>
          <p>{t.admin.userDetailDescription}</p>
        </section>
        {isLoading && <p>{t.admin.loading}</p>}
        {error && <p className="form-error">{error}</p>}
        {!isLoading && user && <AdminUserDetailCard user={user} onRefresh={loadUser} onError={setError} />}
      </AdminGuard>
    </AdminAppShell>
  )
}
