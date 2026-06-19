import type { ForeignerFriendlyCheck, ForeignerFriendlyResult } from "./types"

export type TrustLevelKey = "veryHigh" | "high" | "caution" | "concern" | "veryConcern"

export type TrustLevelStandard = {
  key: TrustLevelKey
  min: number
  max: number
  color: string
  softColor: string
}

export const TRUST_LEVEL_STANDARDS: TrustLevelStandard[] = [
  { key: "veryHigh", min: 90, max: 100, color: "#9B8AFB", softColor: "#F0ECFF" },
  { key: "high", min: 70, max: 89, color: "#8FD8B5", softColor: "#E9F8F0" },
  { key: "caution", min: 50, max: 69, color: "#F6C56F", softColor: "#FFF3D7" },
  { key: "concern", min: 30, max: 49, color: "#F29A7E", softColor: "#FFE9E1" },
  { key: "veryConcern", min: 0, max: 29, color: "#E989B5", softColor: "#FFEAF2" },
]

export function getScoreTone(score: number) {
  if (score >= 75) return "good"
  if (score >= 55) return "warn"
  return "bad"
}

export function clampScore(score: number) {
  return Math.max(0, Math.min(100, score))
}

export function getTrustLevelKey(score: number): TrustLevelKey {
  const safeScore = clampScore(score)
  return TRUST_LEVEL_STANDARDS.find((level) => safeScore >= level.min && safeScore <= level.max)?.key ?? "veryConcern"
}

export function getTrustLevel(score: number): TrustLevelStandard {
  const key = getTrustLevelKey(score)
  return getTrustLevelByKey(key)
}

export function getTrustLevelByKey(key: TrustLevelKey): TrustLevelStandard {
  return TRUST_LEVEL_STANDARDS.find((level) => level.key === key) ?? TRUST_LEVEL_STANDARDS[TRUST_LEVEL_STANDARDS.length - 1]
}

export function normalizeTrustLevelKey(level?: string): TrustLevelKey | undefined {
  if (!level) return undefined
  const normalized = level.trim().toLowerCase()
  const map: Record<string, TrustLevelKey> = {
    veryhigh: "veryHigh",
    "very-high": "veryHigh",
    "very_high": "veryHigh",
    "매우 신뢰": "veryHigh",
    "very trustworthy": "veryHigh",
    "highly trustworthy": "veryHigh",
    high: "high",
    medium: "high",
    "신뢰 가능": "high",
    보통: "high",
    "trustworthy": "high",
    "generally trustworthy": "high",
    caution: "caution",
    "주의": "caution",
    "주의 필요": "caution",
    "needs caution": "caution",
    concern: "concern",
    suspicious: "concern",
    "의심": "concern",
    "의심 높음": "concern",
    "high concern": "concern",
    veryconcern: "veryConcern",
    "very-concern": "veryConcern",
    "very_concern": "veryConcern",
    verysuspicious: "veryConcern",
    "very suspicious": "veryConcern",
    "매우 의심": "veryConcern",
    "very high concern": "veryConcern",
  }

  return map[normalized]
}

export function getTrustLevelKeyFromValue(score?: number, level?: string): TrustLevelKey {
  if (typeof score === "number" && Number.isFinite(score)) return getTrustLevelKey(score)
  return normalizeTrustLevelKey(level) ?? "high"
}

export function formatSignalLevel(level: string | undefined, labels: { low: string; medium: string; high: string; caution?: string }) {
  if (!level) return labels.medium
  const normalized = level.trim().toLowerCase()
  if (normalized === "low" || normalized === "낮음") return labels.low
  if (normalized === "high" || normalized === "높음") return labels.high
  if (normalized === "caution" || normalized === "주의") return labels.caution ?? labels.medium
  return labels.medium
}

const defaultForeignerLabels: Record<keyof ForeignerFriendlyCheck, string> = {
  googleMapLink: "구글맵 링크 있음",
  englishName: "병원 영문명 있음",
  englishGuide: "영어 안내 문구 있음",
  reservationLink: "홈페이지/예약 링크 있음",
  photoInfo: "사진 정보 충분",
}

const defaultForeignerMissingLabels: Record<keyof ForeignerFriendlyCheck, string> = {
  googleMapLink: "구글맵 링크 부족",
  englishName: "병원 영문명 부족",
  englishGuide: "영어 안내 문구 부족",
  reservationLink: "홈페이지/예약 링크 부족",
  photoInfo: "사진 정보 부족",
}

export function calculateForeignerFriendlyScore(
  checks: ForeignerFriendlyCheck,
  labels = defaultForeignerLabels,
  missingLabels = defaultForeignerMissingLabels
): ForeignerFriendlyResult {
  const entries = Object.entries(checks) as [keyof ForeignerFriendlyCheck, boolean][]
  const checkedItems = entries.filter(([, checked]) => checked).map(([key]) => labels[key])
  const missingItems = entries.filter(([, checked]) => !checked).map(([key]) => missingLabels[key])
  const checkedCount = checkedItems.length
  const score = checkedCount * 20

  return {
    checkedCount,
    score,
    stars: checkedCount,
    checkedItems,
    missingItems,
    message:
      checkedCount >= 4
        ? "영문 정보와 지도 접근성이 좋은 편이에요."
        : checkedCount >= 3
          ? "기본 정보는 있지만 영어 안내가 조금 부족해요."
          : "외국인 이용을 위한 정보 보강이 필요해요.",
  }
}
