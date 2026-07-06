"use client"

import { LoginRequiredCard } from "@/components/common/LoginRequiredCard"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth()
  const { t } = useLanguage()

  if (isLoading) return <LoadingSpinner label={t.admin.guardLoading} />

  if (!isAdmin) {
    return (
      <LoginRequiredCard
        title={t.admin.guardTitle}
        description={t.admin.guardDescription}
        showSignup={false}
      />
    )
  }

  return <>{children}</>
}
