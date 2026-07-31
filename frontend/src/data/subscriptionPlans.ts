import policy from "../../../shared/filtory_policy.json"

export const subscriptionPlans = {
  FREE: { name: "Free", monthlyDetailedAnalysisLimit: policy.free.monthlyDetailedAnalysisLimit, usageResetCycle: policy.free.usageResetCycle, usageResetDay: policy.free.usageResetDay, usageResetTimezone: policy.free.usageResetTimezone, recentHistoryLimit: 5, showPartneredInsight: policy.free.showPartneredInsight, allowRewardedAnalysis: true },
  PLUS: { name: "Filtory Plus", monthlyPrice: policy.plus.monthlyPrice, monthlyDetailedAnalysisLimit: policy.plus.monthlyDetailedAnalysisLimit, showPartneredInsight: policy.plus.showPartneredInsight, allowRewardedAnalysis: false },
} as const
