"use client"

import { EmptyState } from "@/components/common/EmptyState"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"

export function RecentAnalysisEmpty() {
  const { t } = useLanguage()

  return (
    <EmptyState
      title={t.home.emptyRecentTitle}
      description={t.home.emptyRecentDescription}
      actionHref={ROUTES.ANALYZE}
      actionLabel={t.home.emptyRecentAction}
    />
  )
}
