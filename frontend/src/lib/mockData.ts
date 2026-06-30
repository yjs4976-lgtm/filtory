export const mockAnalysisResult = {
  hospital_name: "클린피부과의원",
  hospital_name_en: "Clean Skin Clinic",
  category: "피부과",
  total_score: 85,
  trust_score: 85,
  ad_score: 20,
  place_score: 88,
  foreigner_score: 72,
  foreigner_checks: {
    googleMapLink: true,
    englishName: true,
    englishGuide: false,
    reservationLink: true,
    photoInfo: true,
  },
  trust_level: "신뢰 가능",
  summary: {
    ko: "리뷰에 상담 과정과 방문 경험이 포함되어 있어 전반적으로 신뢰 가능한 편입니다. 다만 일부 표현에서 홍보성 문구가 감지되어 추가 확인이 필요합니다.",
    en: "The reviews include consultation details and visit experiences, so they appear generally trustworthy. However, some promotional wording was detected, so additional checking may be helpful.",
  },
  concerns: {
    ko: ["‘이벤트’, ‘강력 추천’ 등 홍보성 표현이 포함되어 있어요.", "유사한 문장 구조의 반복 패턴이 일부 감지되었어요."],
    en: [
      "Promotional wording such as 'event' and 'highly recommend' is included.",
      "Some repeated patterns with similar sentence structures were detected.",
    ],
  },
  evidence: {
    ko: ["‘상담 시간이 길었고’ 등 구체적인 경험이 담겨 있어요.", "‘대기 시간이 20분 정도였습니다’ 처럼 방문 정보가 명확해요."],
    en: [
      "Specific experiences such as 'the consultation took a long time' are included.",
      "Visit details are clear, e.g. 'the wait was about 20 minutes'.",
    ],
  },
}

export const recentAnalyses = [
  {
    id: "1",
    name: { ko: "클린피부과의원 강남점", en: "Clean Dermatology (Gangnam)" },
    category: "derma",
    score: 85,
    date: "2024.05.24",
  },
  {
    id: "2",
    name: { ko: "밝은눈안과 서초점", en: "Bright Eye Clinic (Seocho)" },
    category: "eye",
    score: 78,
    date: "2024.05.21",
  },
  {
    id: "3",
    name: { ko: "스마일치과의원", en: "Smile Dental Clinic" },
    category: "dental",
    score: 62,
    date: "2024.05.18",
  },
]
