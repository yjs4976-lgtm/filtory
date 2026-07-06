import type { UserInsight } from "@/lib/types"

export const userInsightService = {
  async getUserInsight(): Promise<UserInsight | null> {
    // 실제 행동 데이터 API가 준비되기 전에는 개인화 예시를 보여주지 않습니다.
    return null
  },
}
