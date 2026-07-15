import type { SponsoredInsight, SponsoredInsightPlacement } from "@/types/sponsoredInsight"

export const sponsoredInsights: SponsoredInsight[] = [
  {
    id: "partnered-insight-result-001",
    eyebrow: "PARTNERED INSIGHT",
    title: "병원을 선택하기 전, 진료비 외에 확인해야 할 세 가지",
    description: "진료 항목, 추가 비용, 사후 관리 범위를 미리 확인하면 예상하지 못한 비용과 불편을 줄일 수 있습니다.",
    sponsorName: "Filtory Wellness Partner",
    readingTime: "3 min read",
    href: "/about#partnered-content",
    placement: "analysis-result",
    isActive: true,
    personalDataUsed: false,
    personalizedAd: false,
    affectsAnalysis: false,
  },
  {
    id: "partnered-insight-home-001",
    eyebrow: "FILTORY SELECT",
    title: "건강 정보를 읽을 때 함께 확인하면 좋은 기준",
    description: "정보의 출처와 작성 시점, 나에게 적용되는 범위를 차분히 확인하는 방법을 소개합니다.",
    sponsorName: "Filtory Wellness Partner",
    readingTime: "3 min read",
    href: "/about#partnered-content",
    placement: "home",
    isActive: true,
    personalDataUsed: false,
    personalizedAd: false,
    affectsAnalysis: false,
  },
]

export function getActiveSponsoredInsight(placement: SponsoredInsightPlacement) {
  return sponsoredInsights.find((insight) => insight.placement === placement && insight.isActive) ?? null
}

// TODO: Replace mock data with the sponsored-content delivery API.
