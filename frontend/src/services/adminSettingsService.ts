import { apiClient } from "./apiClient"

export type AdminSettings = {
  supportedCategories: string[]
  plans: Array<{
    planCode: string
    planName: string
    monthlyPrice: number
    monthlyAnalysisLimit?: number | null
    active: boolean
  }>
  usagePolicy: {
    freeMonthlyLimit: number
    plusMockMonthlyLimit: number
    usageTypes: string[]
    periodBasis: string
  }
  readonly: boolean
  canEdit: boolean
}

export const adminSettingsService = {
  async getSettings() {
    const result = await apiClient<AdminSettings>("/api/admin/settings", { auth: true })
    return result.data
  },
}
