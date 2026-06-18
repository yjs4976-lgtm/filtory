import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { MyRecentAnalysis } from "@/components/mypage/MyRecentAnalysis"

export default function MyHistoryPage() {
  return (
    <ProtectedRoute>
      <AppShell title="내 분석 기록" showBack>
        <MyRecentAnalysis />
      </AppShell>
    </ProtectedRoute>
  )
}
