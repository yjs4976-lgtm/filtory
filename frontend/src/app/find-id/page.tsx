import { AuthCard } from "@/components/auth/AuthCard"
import { FindIdForm } from "@/components/auth/FindIdForm"

export default function FindIdPage() {
  return (
    <AuthCard
      title="아이디 찾기"
      description="가입할 때 입력한 이름과 휴대폰 번호로 이메일을 확인해요."
    >
      <FindIdForm />
    </AuthCard>
  )
}
