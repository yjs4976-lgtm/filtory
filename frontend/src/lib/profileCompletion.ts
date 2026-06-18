import type { User } from "./types"

export type ProfileCompletionItem = {
  key: string
  label: string
  done: boolean
  weight: number
  href: string
}

export type ProfileCompletionResult = {
  percent: number
  completedItems: ProfileCompletionItem[]
  missingItems: ProfileCompletionItem[]
}

export function calculateProfileCompletion(user: User | null): ProfileCompletionResult {
  const hasSocialProvider = Boolean(user?.socialProviders && Object.values(user.socialProviders).some(Boolean))
  const items: ProfileCompletionItem[] = [
    { key: "name", label: "이름 등록", done: Boolean(user?.name), weight: 15, href: "/mypage/profile" },
    { key: "nickname", label: "닉네임 등록", done: Boolean(user?.nickname), weight: 15, href: "/mypage/profile" },
    { key: "email", label: "이메일 등록", done: Boolean(user?.email), weight: 15, href: "/mypage/profile" },
    { key: "profileImage", label: "프로필 이미지 등록", done: Boolean(user?.profileImageUrl), weight: 20, href: "/mypage/profile" },
    { key: "emailVerified", label: "이메일 인증하기", done: Boolean(user?.emailVerified), weight: 20, href: "/verify-email" },
    {
      key: "loginMethod",
      label: "소셜 계정 연결 또는 비밀번호 설정",
      done: Boolean(hasSocialProvider || user?.hasPassword !== false),
      weight: 15,
      href: "/mypage/security",
    },
  ]
  const completedItems = items.filter((item) => item.done)
  const missingItems = items.filter((item) => !item.done)
  const percent = completedItems.reduce((sum, item) => sum + item.weight, 0)

  return {
    percent,
    completedItems,
    missingItems,
  }
}
