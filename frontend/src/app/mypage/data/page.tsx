import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { DataManageSection } from "@/components/mypage/DataManageSection"
import styles from "@/styles/App.module.css"

export default function MyDataPage() {
  return (
    <ProtectedRoute>
      <AppShell title="내 데이터 관리" showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>내 데이터 관리</h1>
          <p className={styles.bodyText}>Filtory에서 저장된 내 활동 데이터를 확인하고 관리할 수 있어요.</p>
        </section>
        <DataManageSection />
      </AppShell>
    </ProtectedRoute>
  )
}
