import type { HospitalCategory, HospitalItem, HospitalRegionCode, HospitalReviewItem, Language } from "./types"
import { extractRegionLabelFromAddress, getEnglishRegionLabelFromKorean } from "./historyDisplay"

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

const categoryLabels: Record<HospitalCategory, { ko: string; en: string }> = {
  derma: { ko: "피부과", en: "Skin Clinic" },
  eye: { ko: "안과", en: "Eye Clinic" },
  dental: { ko: "치과", en: "Dental Clinic" },
  orthopedics: { ko: "정형외과", en: "Orthopedics" },
}

const demoHospitalSeeds: HospitalItem[] = [
  {
    id: "hospital-skin-001",
    name: "연세밝은피부과",
    hospitalNameKo: "연세밝은피부과",
    hospitalNameEn: "Yonsei Bright Skin Clinic",
    category: "derma",
    region: "seoul",
    address: "서울 강남구 테헤란로 123",
    phone: "02-0000-1001",
    reviewCount: 8,
    sourceName: "Demo Review Source",
    sourceUrl: "https://example.com/filtory/demo/skin-001",
    mapUrl: "https://maps.google.com/?q=Seoul+Gangnam+skin+clinic",
    homepageUrl: "https://example.com/filtory/demo/skin-001/home",
    description: "피부 상태 상담, 레이저 시술, 여드름 관리 리뷰를 함께 확인할 수 있는 데모 병원입니다.",
    imageUrl: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=80",
    treatmentItems: "여드름, 색소, 레이저, 피부관리",
    searchKeywords: ["강남 피부과", "강남역 피부과", "테헤란로 피부과", "skin clinic gangnam"],
  },
  {
    id: "hospital-skin-002",
    name: "안양맑은피부의원",
    hospitalNameKo: "안양맑은피부의원",
    hospitalNameEn: "Anyang Clear Skin Clinic",
    category: "derma",
    region: "gyeonggi",
    address: "경기도 안양시 동안구 관악대로 77",
    phone: "031-000-2002",
    reviewCount: 6,
    sourceName: "Demo Review Source",
    sourceUrl: "https://example.com/filtory/demo/skin-002",
    mapUrl: "https://maps.google.com/?q=Anyang+skin+clinic",
    description: "지역 기반 피부과 리뷰 신뢰도를 확인하기 위한 데모 병원입니다.",
    imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80",
    treatmentItems: "피부질환, 여드름, 레이저",
    searchKeywords: ["안양 피부과", "범계 피부과", "범계역 피부과", "동안구 피부과"],
  },
  {
    id: "hospital-skin-003",
    name: "범계온유피부과",
    hospitalNameKo: "범계온유피부과",
    hospitalNameEn: "Beomgye Onyu Skin Clinic",
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
    hospitalNameKo: "밝은눈안과 강남점",
    hospitalNameEn: "Bright Eye Clinic Gangnam",
    category: "eye",
    region: "seoul",
    address: "서울 서초구 강남대로 321",
    phone: "02-0000-3003",
    reviewCount: 7,
    sourceName: "Demo Review Source",
    sourceUrl: "https://example.com/filtory/demo/eye-001",
    mapUrl: "https://maps.google.com/?q=Gangnam+eye+clinic",
    description: "검사 설명, 시술 후기, 사후 관리 리뷰를 함께 볼 수 있는 안과 데모 병원입니다.",
    imageUrl: "https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=900&q=80",
    treatmentItems: "시력교정, 안구건조, 정밀검사",
    searchKeywords: ["강남 안과", "강남역 안과", "서초 안과", "eye clinic gangnam"],
  },
  {
    id: "hospital-eye-002",
    name: "해운대센텀안과",
    hospitalNameKo: "해운대센텀안과",
    hospitalNameEn: "Haeundae Centum Eye Clinic",
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
    hospitalNameKo: "범계밝은안과",
    hospitalNameEn: "Beomgye Bright Eye Clinic",
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
    hospitalNameKo: "화이트치과의원",
    hospitalNameEn: "White Dental Clinic",
    category: "dental",
    region: "seoul",
    address: "서울 마포구 양화로 88",
    phone: "02-0000-5005",
    reviewCount: 9,
    sourceName: "Demo Review Source",
    sourceUrl: "https://example.com/filtory/demo/dental-001",
    homepageUrl: "https://example.com/filtory/demo/dental-001/home",
    description: "치료 비용 설명, 과잉 진료 우려, 재방문 후기 등을 비교할 수 있는 치과 데모 병원입니다.",
    imageUrl: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=900&q=80",
    treatmentItems: "스케일링, 임플란트, 교정, 충치치료",
    searchKeywords: ["강남 치과", "마포 치과", "홍대입구 치과", "dental clinic seoul"],
  },
  {
    id: "hospital-dental-002",
    name: "대전튼튼치과",
    hospitalNameKo: "대전튼튼치과",
    hospitalNameEn: "Daejeon Tuntun Dental Clinic",
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
    hospitalNameKo: "강남미소치과",
    hospitalNameEn: "Gangnam Miso Dental Clinic",
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

export const demoHospitals: HospitalItem[] = demoHospitalSeeds.map((hospital) => {
  const regionKoLabel = hospital.regionKoLabel || extractRegionLabelFromAddress(hospital.address)

  return {
    ...hospital,
    categoryKoLabel: hospital.categoryKoLabel || categoryLabels[hospital.category].ko,
    categoryEnLabel: hospital.categoryEnLabel || categoryLabels[hospital.category].en,
    regionKoLabel,
    regionEnLabel: hospital.regionEnLabel || getEnglishRegionLabelFromKorean(regionKoLabel) || undefined,
  }
})

// 샘플 병원 데이터는 로컬 개발에서 명시적으로 mock 플래그를 켰을 때만 사용한다.
const demoEnabled = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_MOCK === "true"

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
  orthopedics: [
    "통증 원인과 치료 계획을 이해하기 쉽게 설명해줬어요.",
    "검사 결과와 재활 일정을 구체적으로 안내받았습니다.",
  ],
} satisfies Record<HospitalCategory, string[]>

export function getRegionLabel(region: HospitalRegionCode | string, language: Language) {
  const item = hospitalRegions.find((current) => current.code === region)
  if (!item) return region
  return language === "ko" ? item.ko : item.en
}

export function getHospitalDisplayName(
  hospital: Pick<HospitalItem, "name" | "hospitalNameKo" | "hospitalNameEn" | "hospitalEnglishName">,
  language: Language
) {
  if (language === "en") {
    return hospital.hospitalEnglishName || hospital.hospitalNameEn || hospital.name
  }

  return hospital.hospitalNameKo || hospital.name
}

export function getDemoReviewsForHospital(hospital: HospitalItem): HospitalReviewItem[] {
  if (!demoEnabled) return []
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
    memberId: index % 2 === 0 ? "demo-member" : undefined,
    visitDate: `2026-06-${String(12 - index).padStart(2, "0")}`,
    createdAt: `2026-06-${String(18 - index).padStart(2, "0")}`,
    sourceName: hospital.sourceName,
    sourceUrl: hospital.sourceUrl,
    trustSignal: index === 2 ? "medium" : "high",
    adSuspicion: index === 2 ? "medium" : "low",
    images: index === 0 && hospital.imageUrl
      ? [{ id: `${hospital.id}-image-1`, reviewId: `${hospital.id}-review-${index + 1}`, imageUrl: hospital.imageUrl, altText: hospital.name }]
      : [],
    comments: [
      {
        id: `${hospital.id}-comment-${index + 1}-1`,
        reviewId: `${hospital.id}-review-${index + 1}`,
        authorName: "Filtory",
        content: index === 2 ? "반복되는 이벤트 문구는 분석 시 주의 지표로 참고해주세요." : "구체적인 방문 경험이 포함되어 참고하기 좋아요.",
        likeCount: index + 1,
        dislikeCount: index === 2 ? 1 : 0,
        createdAt: `2026-06-${String(17 - index).padStart(2, "0")}`,
        replies: [],
      },
    ],
  }))
}

export function getDemoHospitalById(id: string) {
  if (!demoEnabled) return undefined
  return demoHospitals.find((hospital) => hospital.id === id)
}

function normalizeSearchText(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .replace(/경기도/g, "경기")
    .replace(/서울특별시/g, "서울")
    .replace(/부산광역시/g, "부산")
    .replace(/대구광역시/g, "대구")
    .replace(/인천광역시/g, "인천")
    .replace(/광주광역시/g, "광주")
    .replace(/대전광역시/g, "대전")
    .replace(/울산광역시/g, "울산")
    .replace(/\s+/g, " ")
    .trim()
}

function categoryTerms(category?: HospitalCategory) {
  if (category === "derma") return ["derma", "dermatology", "skin", "skin clinic", "피부과"]
  if (category === "eye") return ["eye", "ophthalmology", "eye clinic", "안과"]
  if (category === "dental") return ["dental", "dentistry", "dental clinic", "치과"]
  if (category === "orthopedics") return ["orthopedics", "orthopedic", "orthopedic clinic", "정형외과", "정형"]
  return []
}

export function searchDemoHospitals({
  category,
  region,
  query,
}: {
  category?: HospitalCategory
  region?: HospitalRegionCode
  query: string
}) {
  if (!demoEnabled) return []
  const normalizedQuery = normalizeSearchText(query)
  const regionLabel = hospitalRegions.find((item) => item.code === region)
  const regionTerms = [regionLabel?.ko, regionLabel?.en, region]
    .filter(Boolean)
    .map((value) => normalizeSearchText(String(value)))
  const categorySearchTerms = categoryTerms(category)

  return demoHospitals
    .map((hospital) => {
      const hospitalCategoryTerms = categoryTerms(hospital.category)
      const searchable = [
        hospital.name,
        hospital.hospitalNameKo,
        hospital.hospitalNameEn,
        hospital.hospitalEnglishName,
        hospital.address,
        hospital.sourceName,
        hospital.phone,
        getRegionLabel(hospital.region, "ko"),
        getRegionLabel(hospital.region, "en"),
        ...hospitalCategoryTerms,
        ...(hospital.searchKeywords ?? []),
      ]
        .filter(Boolean)
        .join(" ")
      const normalizedSearchable = normalizeSearchText(searchable)
      const matchesCategory = !category || hospital.category === category || categorySearchTerms.some((term) => normalizedSearchable.includes(term))
      const matchesRegion = !region || hospital.region === region || regionTerms.some((term) => normalizedSearchable.includes(term))
      const matchesQuery = !normalizedQuery || normalizedSearchable.includes(normalizedQuery)

      if (!normalizedQuery && !matchesCategory && !matchesRegion) return null
      if (normalizedQuery && !matchesQuery) return null

      return {
        hospital,
        score: (matchesQuery ? 100 : 0) + (matchesRegion ? 30 : 0) + (matchesCategory ? 20 : 0),
      }
    })
    .filter((item): item is { hospital: HospitalItem; score: number } => Boolean(item))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.hospital)
}
