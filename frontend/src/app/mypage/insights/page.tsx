"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { UserCategoryStats } from "@/components/mypage/UserCategoryStats"
import { UserInsightCard } from "@/components/mypage/UserInsightCard"
import { UserPreferenceSummary } from "@/components/mypage/UserPreferenceSummary"
import { useLanguage } from "@/context/LanguageContext"
import type { UserInsight } from "@/lib/types"
import { userInsightService } from "@/services/userInsightService"
import styles from "@/styles/App.module.css"

export default function UserInsightsPage() {
  const { t } = useLanguage()
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
      <AppShell title={t.mypage.insightsPageTitle} showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>{t.mypage.insightsPageTitle}</h1>
          <p className={styles.bodyText}>{t.mypage.insightsPageDescription}</p>
        </section>
        {!insight ? (
          <LoadingSpinner label={t.mypage.loadingInsights} />
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
