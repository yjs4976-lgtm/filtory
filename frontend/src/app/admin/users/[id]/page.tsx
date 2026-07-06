"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import type { AdminUser, AnalysisHistoryItem, MyReport, SavedHospital } from "@/lib/types"
import { AdminAppShell } from "@/components/admin/AdminAppShell"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { adminUserService } from "@/services/adminUserService"
import { AdminUserActivity } from "@/components/admin/users/AdminUserActivity"
import { AdminUserDetailCard } from "@/components/admin/users/AdminUserDetailCard"
import { AdminUserMemo } from "@/components/admin/users/AdminUserMemo"
import { AdminUserSanctionHistory } from "@/components/admin/users/AdminUserSanctionHistory"

type ActivityState = {
  analysisHistory: AnalysisHistoryItem[]
  savedHospitals: SavedHospital[]
  reports: MyReport[]
}

export default function AdminUserDetailPage() {
  const { t } = useLanguage()
  const params = useParams<{ id: string }>()
  const userId = Number(params.id)
  const [user, setUser] = useState<AdminUser | null>(null)
  const [activity, setActivity] = useState<ActivityState | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([adminUserService.getUserDetail(userId), adminUserService.getUserActivity(userId)]).then(
      ([nextUser, nextActivity]) => {
        if (!alive) return
        setUser(nextUser)
        setActivity(nextActivity)
      }
    )
    return () => {
      alive = false
    }
  }, [userId])

  return (
    <AdminAppShell title={t.admin.userDetailTitle}>
      <AdminGuard>
        <section className="page-title">
          <p className="eyebrow">ADMIN USER DETAIL</p>
          <h1>{t.admin.userDetailTitle}</h1>
          <p>{t.admin.userDetailDescription}</p>
        </section>
        {!user || !activity ? (
          <p>{t.admin.loading}</p>
        ) : (
          <>
            <AdminUserDetailCard user={user} />
            <AdminUserActivity
              analysisHistory={activity.analysisHistory}
              savedHospitals={activity.savedHospitals}
              reports={activity.reports}
            />
            <AdminUserMemo userId={user.id} initialMemo={user.memo} />
            <AdminUserSanctionHistory />
          </>
        )}
      </AdminGuard>
    </AdminAppShell>
  )
}
