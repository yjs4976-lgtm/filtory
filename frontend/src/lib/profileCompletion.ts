import type { User } from "./types"

export type ProfileCompletionItem = {
  key: "name" | "nickname" | "email" | "profileImage" | "emailVerified" | "dateOfBirth" | "gender"
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
  const items: ProfileCompletionItem[] = [
    { key: "name", done: Boolean(user?.name), weight: 16, href: "/mypage/profile" },
    { key: "nickname", done: Boolean(user?.nickname), weight: 16, href: "/mypage/profile" },
    { key: "email", done: Boolean(user?.email), weight: 16, href: "/mypage/profile" },
    { key: "profileImage", done: Boolean(user?.profileImageUrl), weight: 16, href: "/mypage/profile" },
    { key: "emailVerified", done: Boolean(user?.emailVerified), weight: 16, href: "/verify-email" },
    { key: "dateOfBirth", done: Boolean(user?.dateOfBirth), weight: 10, href: "/mypage/profile#date-of-birth" },
    { key: "gender", done: user?.gender != null, weight: 10, href: "/mypage/profile#gender" },
  ]
  const completedItems = items.filter((item) => item.done)
  const missingItems = items.filter((item) => !item.done)
  const percent = Math.max(0, Math.min(100, completedItems.reduce((sum, item) => sum + item.weight, 0)))

  return {
    percent,
    completedItems,
    missingItems,
  }
}
