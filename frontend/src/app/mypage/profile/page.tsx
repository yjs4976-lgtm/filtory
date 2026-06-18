import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { ProfileEditForm } from "@/components/mypage/ProfileEditForm"
import styles from "@/styles/App.module.css"

export default function MyProfilePage() {
  return (
    <ProtectedRoute>
      <AppShell title="회원 정보 수정" showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>회원 정보 수정</h1>
          <p className={styles.bodyText}>닉네임과 비밀번호를 관리할 수 있어요.</p>
        </section>

        <ProfileEditForm />
      </AppShell>
    </ProtectedRoute>
  )
}
