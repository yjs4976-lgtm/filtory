import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { NotificationList } from "@/components/mypage/NotificationList"
import styles from "@/styles/App.module.css"

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <AppShell title="알림" showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>알림</h1>
          <p className={styles.bodyText}>분석 완료, 신고 처리 결과, 저장한 병원 변경 소식을 확인해요.</p>
        </section>
        <NotificationList />
      </AppShell>
    </ProtectedRoute>
  )
}
