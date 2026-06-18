import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { WithdrawalForm } from "@/components/mypage/WithdrawalForm"
import styles from "@/styles/App.module.css"

export default function WithdrawalPage() {
  return (
    <ProtectedRoute>
      <AppShell title="회원 탈퇴" showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>회원 탈퇴</h1>
          <p className={styles.bodyText}>탈퇴 전 안내 사항을 꼭 확인해주세요.</p>
        </section>

        <WithdrawalForm />
      </AppShell>
    </ProtectedRoute>
  )
}
