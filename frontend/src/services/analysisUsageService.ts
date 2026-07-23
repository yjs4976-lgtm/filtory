import { apiClient } from "./apiClient"
import type { AnalysisAllowance } from "@/types/analysisAllowance"
import type { MembershipEntitlement } from "@/types/subscription"

export type ServerMembership = Pick<
  MembershipEntitlement,
  "plan" | "status" | "provider" | "currentPeriodStart" | "currentPeriodEnd"
> & { baseLimit: number }

export type ServerAnalysisUsage = ServerMembership & {
  periodKey: string
  usedCount: number
  rewardCount: number
  adminGrantedCount: number
  availableCount: number
  remainingCount: number
  canUseDetailedAnalysis: boolean
  charged?: boolean
  alreadyCharged?: boolean
}

export const analysisUsageService = {
  async getMembership() {
    return (await apiClient<ServerMembership>("/api/membership/me", { auth: true })).data
  },
  async getUsage() {
    return (await apiClient<ServerAnalysisUsage>("/api/analysis/usage/me", { auth: true })).data
  },
  async charge(analysisResultId: string | number) {
    return (await apiClient<ServerAnalysisUsage>("/api/analysis/usage/charge", {
      method: "POST",
      auth: true,
      body: { analysis_result_id: Number(analysisResultId) },
    })).data
  },
  async getAccess(analysisResultId: string | number) {
    return (await apiClient<ServerAnalysisUsage & { canAccess: boolean; alreadyCharged: boolean }>(
      `/api/analysis/${Number(analysisResultId)}/access`,
      { auth: true },
    )).data
  },
}

export function serverUsageToAllowance(usage: ServerAnalysisUsage): AnalysisAllowance {
  return {
    periodKey: usage.periodKey,
    baseLimit: usage.baseLimit,
    rewardCount: usage.rewardCount,
    adminGrantedCount: usage.adminGrantedCount,
    usedCount: usage.usedCount,
    rewardedToday: false,
  }
}
