"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { UserCategoryStats } from "@/components/mypage/UserCategoryStats"
import { UserInsightCard } from "@/components/mypage/UserInsightCard"
import { UserPreferenceSummary } from "@/components/mypage/UserPreferenceSummary"
import type { UserInsight } from "@/lib/types"
import { userInsightService } from "@/services/userInsightService"
import styles from "@/styles/App.module.css"

export default function UserInsightsPage() {
  const [insight, setInsight] = useState<UserInsight | null>(null)

  useEffect(() => {
    let alive = true
    userInsightService.getUserInsight().then((nextInsight) => {
      if (alive) setInsight(nextInsight)
    })
    return () => {
      alive = false
    }
  }, [])

  return (
    <ProtectedRoute>
      <AppShell title="나의 병원 선택 성향" showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>나의 병원 선택 성향</h1>
          <p className={styles.bodyText}>내가 어떤 기준으로 병원을 살펴보는지 부드럽게 정리했어요.</p>
        </section>
        {!insight ? (
          <LoadingSpinner label="선택 성향을 분석하고 있어요." />
        ) : (
          <>
            <UserInsightCard insight={insight} />
            <UserCategoryStats insight={insight} />
            <UserPreferenceSummary insight={insight} />
          </>
        )}
      </AppShell>
    </ProtectedRoute>
  )
}
