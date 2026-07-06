import type { ForeignerFriendlyCheck, ForeignerFriendlyResult } from "./types"

export type TrustLevelKey = "very_safe" | "safe" | "normal" | "caution" | "danger"

export type TrustLevelStandard = {
  key: TrustLevelKey
  min: number
  max: number
  color: string
  softColor: string
}

export const TRUST_LEVEL_STANDARDS: TrustLevelStandard[] = [
  { key: "very_safe", min: 85, max: 100, color: "#9B8AFB", softColor: "#F0ECFF" },
  { key: "safe", min: 70, max: 84, color: "#8FD8B5", softColor: "#E9F8F0" },
  { key: "normal", min: 50, max: 69, color: "#F6C56F", softColor: "#FFF3D7" },
  { key: "caution", min: 30, max: 49, color: "#F29A7E", softColor: "#FFE9E1" },
  { key: "danger", min: 0, max: 29, color: "#E989B5", softColor: "#FFEAF2" },
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
  return TRUST_LEVEL_STANDARDS.find((level) => safeScore >= level.min && safeScore <= level.max)?.key ?? "danger"
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
    veryhigh: "very_safe",
    "very-high": "very_safe",
    "very_high": "very_safe",
    verysafe: "very_safe",
    "very-safe": "very_safe",
    "very_safe": "very_safe",
    "매우 안전": "very_safe",
    "매우 신뢰": "very_safe",
    "very trustworthy": "very_safe",
    "highly trustworthy": "very_safe",
    high: "safe",
    safe: "safe",
    안전: "safe",
    medium: "normal",
    normal: "normal",
    "신뢰 가능": "safe",
    보통: "normal",
    "trustworthy": "safe",
    "generally trustworthy": "safe",
    low: "caution",
    caution: "caution",
    "주의": "caution",
    "주의 필요": "caution",
    "needs caution": "caution",
    concern: "caution",
    suspicious: "caution",
    "의심": "caution",
    "의심 높음": "caution",
    "high concern": "caution",
    veryconcern: "danger",
    "very-concern": "danger",
    "very_concern": "danger",
    verylow: "danger",
    "very_low": "danger",
    "very-low": "danger",
    danger: "danger",
    위험: "danger",
    verysuspicious: "danger",
    "very suspicious": "danger",
    "매우 의심": "danger",
    "very high concern": "danger",
  }

  return map[normalized]
}

export function getTrustLevelKeyFromValue(score?: number, level?: string): TrustLevelKey {
  if (typeof score === "number" && Number.isFinite(score)) return getTrustLevelKey(score)
  return normalizeTrustLevelKey(level) ?? "safe"
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
  googleMapLink: "지도 링크 있음",
  englishName: "병원 영문명 있음",
  englishGuide: "영어 안내 문구 있음",
  reservationLink: "홈페이지/예약 링크 있음",
  photoInfo: "이미지 자료 확인 가능",
}

const defaultForeignerMissingLabels: Record<keyof ForeignerFriendlyCheck, string> = {
  googleMapLink: "지도 링크 부족",
  englishName: "병원 영문명 부족",
  englishGuide: "영어 안내 문구 부족",
  reservationLink: "홈페이지/예약 링크 부족",
  photoInfo: "이미지 자료 확인 필요",
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
