import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { AnalysisHistoryList } from "@/components/mypage/AnalysisHistoryList"
import styles from "@/styles/App.module.css"

export default function MyHistoryPage() {
  return (
    <ProtectedRoute>
      <AppShell title="내 분석 기록" showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>내 분석 기록</h1>
          <p className={styles.bodyText}>분석했던 병원을 검색하고 신뢰도 기준으로 다시 확인할 수 있어요.</p>
        </section>
        <AnalysisHistoryList />
      </AppShell>
    </ProtectedRoute>
  )
}
