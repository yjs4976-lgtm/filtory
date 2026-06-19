import type { HospitalCategory, HospitalItem, HospitalRegionCode, HospitalReviewItem, Language } from "./types"

export const hospitalRegions: Array<{ code: HospitalRegionCode; ko: string; en: string }> = [
  { code: "seoul", ko: "서울", en: "Seoul" },
  { code: "gyeonggi", ko: "경기", en: "Gyeonggi" },
  { code: "incheon", ko: "인천", en: "Incheon" },
  { code: "busan", ko: "부산", en: "Busan" },
  { code: "daegu", ko: "대구", en: "Daegu" },
  { code: "daejeon", ko: "대전", en: "Daejeon" },
  { code: "gwangju", ko: "광주", en: "Gwangju" },
  { code: "ulsan", ko: "울산", en: "Ulsan" },
  { code: "sejong", ko: "세종", en: "Sejong" },
  { code: "gangwon", ko: "강원", en: "Gangwon" },
  { code: "chungbuk", ko: "충북", en: "Chungbuk" },
  { code: "chungnam", ko: "충남", en: "Chungnam" },
  { code: "jeonbuk", ko: "전북", en: "Jeonbuk" },
  { code: "jeonnam", ko: "전남", en: "Jeonnam" },
  { code: "gyeongbuk", ko: "경북", en: "Gyeongbuk" },
  { code: "gyeongnam", ko: "경남", en: "Gyeongnam" },
  { code: "jeju", ko: "제주", en: "Jeju" },
]

export const demoHospitals: HospitalItem[] = [
  {
    id: "hospital-skin-001",
    name: "연세밝은피부과",
    category: "derma",
    region: "seoul",
    address: "서울 강남구 테헤란로 123",
    phone: "02-0000-1001",
    reviewCount: 8,
    sourceName: "Demo Review Source",
    sourceUrl: "https://example.com/filtory/demo/skin-001",
    mapUrl: "https://maps.google.com/?q=Seoul+Gangnam+skin+clinic",
    homepageUrl: "https://example.com/filtory/demo/skin-001/home",
    searchKeywords: ["강남 피부과", "강남역 피부과", "테헤란로 피부과", "skin clinic gangnam"],
  },
  {
    id: "hospital-skin-002",
    name: "안양맑은피부의원",
    category: "derma",
    region: "gyeonggi",
    address: "경기도 안양시 동안구 관악대로 77",
    phone: "031-000-2002",
    reviewCount: 6,
    sourceName: "Demo Review Source",
    sourceUrl: "https://example.com/filtory/demo/skin-002",
    mapUrl: "https://maps.google.com/?q=Anyang+skin+clinic",
    searchKeywords: ["안양 피부과", "범계 피부과", "범계역 피부과", "동안구 피부과"],
  },
  {
    id: "hospital-skin-003",
    name: "범계온유피부과",
    category: "derma",
    region: "gyeonggi",
    address: "경기도 안양시 동안구 시민대로 180",
    phone: "031-000-2103",
    reviewCount: 5,
    sourceName: "Demo Review Source",
    sourceUrl: "https://example.com/filtory/demo/skin-003",
    mapUrl: "https://maps.google.com/?q=Beomgye+skin+clinic",
    searchKeywords: ["범계역 피부과", "안양 피부과", "동안구 피부과"],
  },
  {
    id: "hospital-eye-001",
    name: "밝은눈안과 강남점",
    category: "eye",
    region: "seoul",
    address: "서울 서초구 강남대로 321",
    phone: "02-0000-3003",
    reviewCount: 7,
    sourceName: "Demo Review Source",
    sourceUrl: "https://example.com/filtory/demo/eye-001",
    mapUrl: "https://maps.google.com/?q=Gangnam+eye+clinic",
    searchKeywords: ["강남 안과", "강남역 안과", "서초 안과", "eye clinic gangnam"],
  },
  {
    id: "hospital-eye-002",
    name: "해운대센텀안과",
    category: "eye",
    region: "busan",
    address: "부산 해운대구 센텀중앙로 45",
    phone: "051-000-4004",
    reviewCount: 5,
    sourceName: "Demo Review Source",
    sourceUrl: "https://example.com/filtory/demo/eye-002",
    searchKeywords: ["부산 해운대 안과", "해운대 안과", "센텀 안과"],
  },
  {
    id: "hospital-eye-003",
    name: "범계밝은안과",
    category: "eye",
    region: "gyeonggi",
    address: "경기도 안양시 동안구 평촌대로 217",
    phone: "031-000-4105",
    reviewCount: 7,
    sourceName: "Demo Review Source",
    sourceUrl: "https://example.com/filtory/demo/eye-003",
    mapUrl: "https://maps.google.com/?q=Beomgye+eye+clinic",
    searchKeywords: ["범계역 안과", "안양 안과", "평촌 안과"],
  },
  {
    id: "hospital-dental-001",
    name: "화이트치과의원",
    category: "dental",
    region: "seoul",
    address: "서울 마포구 양화로 88",
    phone: "02-0000-5005",
    reviewCount: 9,
    sourceName: "Demo Review Source",
    sourceUrl: "https://example.com/filtory/demo/dental-001",
    homepageUrl: "https://example.com/filtory/demo/dental-001/home",
    searchKeywords: ["강남 치과", "마포 치과", "홍대입구 치과", "dental clinic seoul"],
  },
  {
    id: "hospital-dental-002",
    name: "대전튼튼치과",
    category: "dental",
    region: "daejeon",
    address: "대전 서구 둔산로 100",
    phone: "042-000-6006",
    reviewCount: 6,
    sourceName: "Demo Review Source",
    sourceUrl: "https://example.com/filtory/demo/dental-002",
    searchKeywords: ["대전 치과", "둔산동 치과", "둔산 치과"],
  },
  {
    id: "hospital-dental-003",
    name: "강남미소치과",
    category: "dental",
    region: "seoul",
    address: "서울 강남구 강남대로 456",
    phone: "02-0000-5107",
    reviewCount: 8,
    sourceName: "Demo Review Source",
    sourceUrl: "https://example.com/filtory/demo/dental-003",
    mapUrl: "https://maps.google.com/?q=Gangnam+dental+clinic",
    searchKeywords: ["강남 치과", "강남역 치과", "신논현 치과"],
  },
]

const sharedReviews = {
  derma: [
    "상담 때 피부 상태를 자세히 봐주고 시술 후 관리 방법을 구체적으로 설명해줬어요.",
    "대기 시간이 조금 있었지만 과한 권유 없이 필요한 치료만 안내받았습니다.",
    "이벤트 문구가 많아서 처음에는 광고 같았지만 실제 진료 설명은 차분했어요.",
    "레이저 후 붉어짐과 관리 기간을 솔직하게 알려줘서 신뢰가 갔습니다.",
  ],
  eye: [
    "검사 과정과 수술 가능 여부를 단계별로 설명해줘서 이해하기 쉬웠어요.",
    "장비 안내는 자세했지만 비용 설명은 조금 더 명확했으면 좋겠습니다.",
    "후기마다 당일 예약을 강조하는 표현이 반복돼서 한 번 더 확인이 필요해 보여요.",
    "사후 관리 일정과 주의사항을 문서로 안내받아서 안심됐습니다.",
  ],
  dental: [
    "치료 계획과 예상 비용을 먼저 알려줘서 결정하기 편했어요.",
    "스케일링 후 관리법을 자세히 알려줬고 과잉 진료 느낌은 적었습니다.",
    "임플란트 이벤트 표현이 반복되어 광고성 여부는 확인해볼 필요가 있어요.",
    "통증이 있었던 부분과 다음 방문 일정을 꼼꼼히 설명해줬습니다.",
  ],
} satisfies Record<HospitalCategory, string[]>

export function getRegionLabel(region: HospitalRegionCode | string, language: Language) {
  const item = hospitalRegions.find((current) => current.code === region)
  if (!item) return region
  return language === "ko" ? item.ko : item.en
}

export function getDemoReviewsForHospital(hospital: HospitalItem): HospitalReviewItem[] {
  const contents = [
    ...sharedReviews[hospital.category],
    "접수 과정은 빠른 편이었고 직원 안내가 친절했습니다.",
    "리뷰마다 비슷한 표현이 일부 있어 실제 방문 경험인지 확인해볼 필요가 있어요.",
    "위치와 예약 링크를 찾기 쉬워 처음 방문할 때 도움이 됐습니다.",
  ]
  return contents.map((content, index) => ({
    id: `${hospital.id}-review-${index + 1}`,
    hospitalId: hospital.id,
    rating: index === 2 ? 3 : 4 + (index % 2),
    content,
    createdAt: `2026-06-${String(18 - index).padStart(2, "0")}`,
    sourceName: hospital.sourceName,
    sourceUrl: hospital.sourceUrl,
    trustSignal: index === 2 ? "medium" : "high",
    adSuspicion: index === 2 ? "medium" : "low",
  }))
}

export function searchDemoHospitals({
  category,
  region,
  query,
}: {
  category: HospitalCategory
  region?: HospitalRegionCode
  query: string
}) {
  const normalizedQuery = query.trim().toLowerCase()
  const regionLabel = hospitalRegions.find((item) => item.code === region)
  const regionTerms = [regionLabel?.ko, regionLabel?.en, region].filter(Boolean).map((value) => String(value).toLowerCase())

  return demoHospitals.filter((hospital) => {
    const searchable = [
      hospital.name,
      hospital.address,
      hospital.sourceName,
      hospital.phone,
      getRegionLabel(hospital.region, "ko"),
      getRegionLabel(hospital.region, "en"),
      ...(hospital.searchKeywords ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    const matchesCategory = hospital.category === category
    const matchesRegion = !region || hospital.region === region || regionTerms.some((term) => searchable.includes(term))
    const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery)

    return matchesCategory && matchesRegion && matchesQuery
  })
}
