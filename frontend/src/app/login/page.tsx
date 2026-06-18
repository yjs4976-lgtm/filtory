import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import styles from "@/styles/App.module.css";

export default function LoginPage() {
  return (
    <AuthCard
      title="로그인"
      description="Filtory에서 병원 리뷰 분석 기록을 안전하게 관리해보세요."
    >
      <LoginForm />

      <div className={styles.authDivider}>
        <span>또는</span>
      </div>

      <SocialLoginButtons />
    </AuthCard>
  );
}
