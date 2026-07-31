export type AnalysisUsageType = "FREE_BASE" | "REWARDED" | "PLUS" | "ADMIN_GRANTED"
export interface AnalysisAllowance { periodKey: string; baseLimit: number; rewardCount: number; adminGrantedCount: number; usedCount: number; rewardedToday: boolean; lastRewardedAt?: string; isUnlimited?: boolean }
export interface AnalysisUsageEvent { id: string; userId: string; analysisId: string; usageType: AnalysisUsageType; chargedAt: string }
export interface MonthlyFreeUsage { detailedAnalysisLimit: number; detailedAnalysisUsed: number; usagePeriodStart: string; usagePeriodEnd: string; nextResetAt: string }
