import { LoginRequiredCard } from "@/components/common/LoginRequiredCard"

export function LoginRequiredPanel() {
  return (
    <LoginRequiredCard
      title="로그인이 필요한 기능이에요."
      description="분석 기록과 회원 정보를 확인하려면 로그인해주세요."
    />
  )
}
