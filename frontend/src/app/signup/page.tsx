import { AuthCard } from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/SignupForm";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import styles from "@/styles/App.module.css";

export default function SignupPage() {
  return (
    <AuthCard
      title="회원가입"
      description="리뷰 신뢰도 분석을 저장하고 다시 확인할 수 있어요."
    >
      <SignupForm />

      <div className={styles.authDivider}>
        <span>또는</span>
      </div>

      <SocialLoginButtons />
    </AuthCard>
  );
}
