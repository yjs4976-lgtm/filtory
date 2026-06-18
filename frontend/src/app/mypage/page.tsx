"use client"

import { AppShell } from "@/components/common/AppShell"
import { LoginRequiredPanel } from "@/components/mypage/LoginRequiredPanel"
import { MyAnalysisSummary } from "@/components/mypage/MyAnalysisSummary"
import { MyPageMenuList } from "@/components/mypage/MyPageMenuList"
import { MyPageUserCard } from "@/components/mypage/MyPageUserCard"
import { MyRecentAnalysis } from "@/components/mypage/MyRecentAnalysis"
import { useAuth } from "@/hooks/useAuth"

export default function MyPage() {
  const { isAuthenticated, isLoading } = useAuth()

  return (
    <AppShell title="마이페이지" showBack>
      {!isLoading && !isAuthenticated ? (
        <LoginRequiredPanel />
      ) : (
        <>
          <MyPageUserCard />
          <MyAnalysisSummary />
          <MyPageMenuList />
          <MyRecentAnalysis />
        </>
      )}
    </AppShell>
  )
}
