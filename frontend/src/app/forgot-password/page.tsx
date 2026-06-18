import { AuthCard } from "@/components/auth/AuthCard"
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm"

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="비밀번호 찾기"
      description="가입한 이메일로 비밀번호 재설정 링크를 보내드릴게요."
    >
      <ForgotPasswordForm />
    </AuthCard>
  )
}
