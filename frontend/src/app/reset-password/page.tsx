import { Suspense } from "react"
import { AuthCard } from "@/components/auth/AuthCard"
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm"

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="비밀번호 재설정"
      description="새로운 비밀번호를 입력해주세요."
    >
      <Suspense fallback={<p>불러오는 중...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  )
}
