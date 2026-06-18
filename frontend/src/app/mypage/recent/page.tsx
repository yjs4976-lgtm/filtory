import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { RecentViewedHospitalList } from "@/components/mypage/RecentViewedHospitalList"
import styles from "@/styles/App.module.css"

export default function RecentHospitalsPage() {
  return (
    <ProtectedRoute>
      <AppShell title="최근 본 병원" showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>최근 본 병원</h1>
          <p className={styles.bodyText}>최근에 확인한 병원을 다시 볼 수 있어요.</p>
        </section>
        <RecentViewedHospitalList />
      </AppShell>
    </ProtectedRoute>
  )
}
