import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { MyReportList } from "@/components/mypage/MyReportList"
import styles from "@/styles/App.module.css"

export default function MyReportsPage() {
  return (
    <ProtectedRoute>
      <AppShell title="내 신고 내역" showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>내 신고 내역</h1>
          <p className={styles.bodyText}>신고한 리뷰와 병원 정보의 처리 상태를 확인할 수 있어요.</p>
        </section>
        <MyReportList />
      </AppShell>
    </ProtectedRoute>
  )
}
