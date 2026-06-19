"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
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
    <AdminAppShell title="회원 상세">
      <AdminGuard>
        <section className="page-title">
          <p className="eyebrow">ADMIN USER DETAIL</p>
          <h1>회원 상세 보기</h1>
          <p>회원별 분석 기록, 저장 병원, 신고 내역과 관리자 메모를 확인합니다.</p>
        </section>
        {!user || !activity ? (
          <p>불러오는 중...</p>
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
