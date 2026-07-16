export type SponsoredInsightPlacement = "home" | "analysis-result"

export interface SponsoredInsight {
  id: string
  eyebrow: string
  title: string
  description: string
  sponsorName: string
  readingTime?: string
  href?: string
  placement: SponsoredInsightPlacement
  isActive: boolean
  personalDataUsed: boolean
  personalizedAd: boolean
  affectsAnalysis: boolean
}
