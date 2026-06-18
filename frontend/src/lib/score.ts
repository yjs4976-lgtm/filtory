import type { ForeignerFriendlyCheck, ForeignerFriendlyResult } from "./types"

export function getScoreTone(score: number) {
  if (score >= 75) return "good"
  if (score >= 55) return "warn"
  return "bad"
}

export function clampScore(score: number) {
  return Math.max(0, Math.min(100, score))
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
