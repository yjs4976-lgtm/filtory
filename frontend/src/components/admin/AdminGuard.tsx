"use client"

import { LoginRequiredCard } from "@/components/common/LoginRequiredCard"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { useAuth } from "@/hooks/useAuth"

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth()

  if (isLoading) return <LoadingSpinner label="관리자 권한을 확인하고 있어요." />

  if (!isAdmin) {
    return (
      <LoginRequiredCard
        title="관리자 권한이 필요합니다."
        description="회원 정보와 신고 내역은 관리자만 확인할 수 있습니다."
        showSignup={false}
      />
    )
  }

  return <>{children}</>
}
