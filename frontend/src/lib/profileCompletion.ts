import type { User } from "./types"

export type ProfileCompletionItem = {
  key: "name" | "nickname" | "email" | "profileImage" | "emailVerified"
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
    { key: "name", done: Boolean(user?.name), weight: 20, href: "/mypage/profile" },
    { key: "nickname", done: Boolean(user?.nickname), weight: 20, href: "/mypage/profile" },
    { key: "email", done: Boolean(user?.email), weight: 20, href: "/mypage/profile" },
    { key: "profileImage", done: Boolean(user?.profileImageUrl), weight: 20, href: "/mypage/profile" },
    { key: "emailVerified", done: Boolean(user?.emailVerified), weight: 20, href: "/verify-email" },
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
