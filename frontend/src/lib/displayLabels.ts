import type { Language } from "./types"

export const RESULT_DISPLAY_LABELS = {
  globalAccessibility: {
    ko: "외국인 방문 편의도",
    en: "International Visit Convenience",
    shortEn: "Visit Convenience",
  },
} as const

export const GLOBAL_ACCESSIBILITY_CHECK_LABELS = {
  googleMapLink: {
    ko: "지도 위치 정보",
    en: "Map location information",
  },
  googlePlaceId: {
    ko: "구글 장소 정보",
    en: "Google place info",
  },
  englishName: {
    ko: "영문 병원명",
    en: "English clinic name",
  },
  englishGuide: {
    ko: "영어 안내",
    en: "English guidance",
  },
  englishReviews: {
    ko: "영어 리뷰 참고 가능",
    en: "English reviews available",
  },
  homepageOrBookingLink: {
    ko: "홈페이지/예약 링크",
    en: "Homepage/booking link",
  },
  photoInfo: {
    ko: "방문 전 사진 참고자료",
    en: "Pre-visit photo references",
  },
} as const

export type GlobalAccessibilityCheckKey = keyof typeof GLOBAL_ACCESSIBILITY_CHECK_LABELS

export function getGlobalAccessibilityLabel(language: Language, options: { short?: boolean } = {}) {
  if (language === "en" && options.short) {
    return RESULT_DISPLAY_LABELS.globalAccessibility.shortEn
  }
  return RESULT_DISPLAY_LABELS.globalAccessibility[language]
}

export function getGlobalAccessibilityCheckLabel(key: string, language: Language) {
  const labels = GLOBAL_ACCESSIBILITY_CHECK_LABELS[key as GlobalAccessibilityCheckKey]
  return labels?.[language] ?? key
}
