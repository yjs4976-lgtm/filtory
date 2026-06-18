import type { UserInsight } from "@/lib/types"
import { mockUserInsight } from "./memberMockData"

export const userInsightService = {
  async getUserInsight(): Promise<UserInsight> {
    // TODO: 실제 개인화 인사이트 API가 준비되면 /api/member/insights로 교체합니다.
    return mockUserInsight
  },
}
