import { KOREA_REGION_OPTIONS, getRegionLabel, getRegionProvince, type RegionProvinceCode } from "@/lib/regions"
import type { Language } from "@/lib/types"

type HistoryDisplayRecord = {
  hospitalName?: unknown
  hospital_name?: unknown
  hospitalNameKo?: unknown
  hospital_name_ko?: unknown
  hospitalNameEn?: unknown
  hospital_name_en?: unknown
  hospitalEnglishName?: unknown
  hospital_english_name?: unknown
  englishName?: unknown
  english_name?: unknown
  category?: unknown
  categoryKoLabel?: unknown
  category_ko_label?: unknown
  categoryEnLabel?: unknown
  category_en_label?: unknown
  hospitalCategory?: unknown
  hospital_category?: unknown
  region?: unknown
  hospitalRegion?: unknown
  hospital_region?: unknown
  regionId?: unknown
  region_id?: unknown
  regionLabel?: unknown
  region_label?: unknown
  regionKoLabel?: unknown
  region_ko_label?: unknown
  regionEnLabel?: unknown
  region_en_label?: unknown
  regionProvinceCode?: unknown
  region_province_code?: unknown
  regionDistrictCode?: unknown
  region_district_code?: unknown
  hospitalAddress?: unknown
  hospital_address?: unknown
  roadAddress?: unknown
  road_address?: unknown
  address?: unknown
  location?: unknown
}

const EMPTY_REGION_FALLBACKS = new Set([
  "no region info",
  "region not available",
  "지역 정보 없음",
  "정보 없음",
])

const PROVINCE_LABEL_ALIASES: Record<string, string> = {
  서울특별시: "서울",
  부산광역시: "부산",
  대구광역시: "대구",
  인천광역시: "인천",
  광주광역시: "광주",
  대전광역시: "대전",
  울산광역시: "울산",
  세종특별자치시: "세종",
  경기도: "경기",
  강원특별자치도: "강원",
  강원도: "강원",
  충청북도: "충북",
  충청남도: "충남",
  전라북도: "전북",
  전북특별자치도: "전북",
  전라남도: "전남",
  경상북도: "경북",
  경상남도: "경남",
  제주특별자치도: "제주",
  제주도: "제주",
}

const PROVINCE_EN_LABELS: Record<string, string> = {
  서울: "Seoul",
  부산: "Busan",
  대구: "Daegu",
  인천: "Incheon",
  광주: "Gwangju",
  대전: "Daejeon",
  울산: "Ulsan",
  세종: "Sejong",
  경기: "Gyeonggi-do",
  강원: "Gangwon-do",
  충북: "Chungcheongbuk-do",
  충남: "Chungcheongnam-do",
  전북: "Jeonbuk-do",
  전남: "Jeollanam-do",
  경북: "Gyeongsangbuk-do",
  경남: "Gyeongsangnam-do",
  제주: "Jeju-do",
}

const DISTRICT_EN_LABELS: Record<string, string> = {
  강남구: "Gangnam-gu",
  강동구: "Gangdong-gu",
  강북구: "Gangbuk-gu",
  강서구: "Gangseo-gu",
  관악구: "Gwanak-gu",
  광진구: "Gwangjin-gu",
  구로구: "Guro-gu",
  금천구: "Geumcheon-gu",
  노원구: "Nowon-gu",
  도봉구: "Dobong-gu",
  동대문구: "Dongdaemun-gu",
  동작구: "Dongjak-gu",
  마포구: "Mapo-gu",
  서대문구: "Seodaemun-gu",
  서초구: "Seocho-gu",
  성동구: "Seongdong-gu",
  성북구: "Seongbuk-gu",
  송파구: "Songpa-gu",
  양천구: "Yangcheon-gu",
  영등포구: "Yeongdeungpo-gu",
  용산구: "Yongsan-gu",
  은평구: "Eunpyeong-gu",
  종로구: "Jongno-gu",
  중구: "Jung-gu",
  중랑구: "Jungnang-gu",
  수원시: "Suwon-si",
  성남시: "Seongnam-si",
  고양시: "Goyang-si",
  용인시: "Yongin-si",
  부천시: "Bucheon-si",
  안양시: "Anyang-si",
  안산시: "Ansan-si",
  화성시: "Hwaseong-si",
  남양주시: "Namyangju-si",
  평택시: "Pyeongtaek-si",
  의정부시: "Uijeongbu-si",
  시흥시: "Siheung-si",
  파주시: "Paju-si",
  김포시: "Gimpo-si",
  광명시: "Gwangmyeong-si",
  광주시: "Gwangju-si",
  군포시: "Gunpo-si",
  하남시: "Hanam-si",
  오산시: "Osan-si",
  양주시: "Yangju-si",
  이천시: "Icheon-si",
  구리시: "Guri-si",
  안성시: "Anseong-si",
  포천시: "Pocheon-si",
  의왕시: "Uiwang-si",
  여주시: "Yeoju-si",
  동두천시: "Dongducheon-si",
  과천시: "Gwacheon-si",
  분당구: "Bundang-gu",
  수정구: "Sujeong-gu",
  중원구: "Jungwon-gu",
  장안구: "Jangan-gu",
  권선구: "Gwonseon-gu",
  팔달구: "Paldal-gu",
  영통구: "Yeongtong-gu",
  동안구: "Dongan-gu",
  만안구: "Manan-gu",
  단원구: "Danwon-gu",
  상록구: "Sangnok-gu",
  기흥구: "Giheung-gu",
  수지구: "Suji-gu",
  처인구: "Cheoin-gu",
  일산동구: "Ilsandong-gu",
  일산서구: "Ilsanseo-gu",
  덕양구: "Deogyang-gu",
  미추홀구: "Michuhol-gu",
  연수구: "Yeonsu-gu",
  남동구: "Namdong-gu",
  부평구: "Bupyeong-gu",
  계양구: "Gyeyang-gu",
  서구: "Seo-gu",
  동구: "Dong-gu",
  강화군: "Ganghwa-gun",
  옹진군: "Ongjin-gun",
  금정구: "Geumjeong-gu",
  기장군: "Gijang-gun",
  남구: "Nam-gu",
  동래구: "Dongnae-gu",
  부산진구: "Busanjin-gu",
  북구: "Buk-gu",
  사상구: "Sasang-gu",
  사하구: "Saha-gu",
  수영구: "Suyeong-gu",
  연제구: "Yeonje-gu",
  영도구: "Yeongdo-gu",
  해운대구: "Haeundae-gu",
  달서구: "Dalseo-gu",
  달성군: "Dalseong-gun",
  수성구: "Suseong-gu",
  유성구: "Yuseong-gu",
  대덕구: "Daedeok-gu",
  광산구: "Gwangsan-gu",
  울주군: "Ulju-gun",
  세종시: "Sejong-si",
  춘천시: "Chuncheon-si",
  원주시: "Wonju-si",
  강릉시: "Gangneung-si",
  속초시: "Sokcho-si",
  청주시: "Cheongju-si",
  충주시: "Chungju-si",
  제천시: "Jecheon-si",
  천안시: "Cheonan-si",
  아산시: "Asan-si",
  서산시: "Seosan-si",
  논산시: "Nonsan-si",
  전주시: "Jeonju-si",
  군산시: "Gunsan-si",
  익산시: "Iksan-si",
  정읍시: "Jeongeup-si",
  목포시: "Mokpo-si",
  여수시: "Yeosu-si",
  순천시: "Suncheon-si",
  나주시: "Naju-si",
  포항시: "Pohang-si",
  경주시: "Gyeongju-si",
  구미시: "Gumi-si",
  경산시: "Gyeongsan-si",
  창원시: "Changwon-si",
  김해시: "Gimhae-si",
  진주시: "Jinju-si",
  양산시: "Yangsan-si",
  제주시: "Jeju-si",
  서귀포시: "Seogwipo-si",
}

const METROPOLITAN_REGION_LABELS = new Set(["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종"])

const BRANCH_LOCATION_EN_LABELS: Record<string, string> = {
  경기: "Gyeonggi",
  수원: "Suwon",
  분당: "Bundang",
  서현: "Seohyeon",
  판교: "Pangyo",
  성남: "Seongnam",
  강남: "Gangnam",
  신논현: "Sinnonhyeon",
  홍대: "Hongdae",
  마포: "Mapo",
  명동: "Myeongdong",
  서울: "Seoul",
  부산: "Busan",
  대구: "Daegu",
  대전: "Daejeon",
  둔산: "Dunsan",
  인천: "Incheon",
  광주: "Gwangju",
  울산: "Ulsan",
  제주: "Jeju",
}

const BRANCH_LOCATION_TOKENS = Object.keys(BRANCH_LOCATION_EN_LABELS).sort((left, right) => right.length - left.length)

const HANGUL_INITIALS = [
  "g",
  "kk",
  "n",
  "d",
  "tt",
  "r",
  "m",
  "b",
  "pp",
  "s",
  "ss",
  "",
  "j",
  "jj",
  "ch",
  "k",
  "t",
  "p",
  "h",
]

const HANGUL_VOWELS = [
  "a",
  "ae",
  "ya",
  "yae",
  "eo",
  "e",
  "yeo",
  "ye",
  "o",
  "wa",
  "wae",
  "oe",
  "yo",
  "u",
  "wo",
  "we",
  "wi",
  "yu",
  "eu",
  "ui",
  "i",
]

const HANGUL_FINALS = [
  "",
  "k",
  "k",
  "ks",
  "n",
  "nj",
  "nh",
  "t",
  "l",
  "lk",
  "lm",
  "lb",
  "ls",
  "lt",
  "lp",
  "lh",
  "m",
  "p",
  "ps",
  "t",
  "t",
  "ng",
  "t",
  "t",
  "k",
  "t",
  "p",
  "t",
]

const HOSPITAL_NAME_PHRASE_LABELS: Record<string, string> = {
  미라클: "Miracle",
  데이뷰: "Dayview",
  톤즈: "Tonz",
  차앤박: "Cha & Park",
  연세: "Yonsei",
  서울: "Seoul",
  강남: "Gangnam",
  강서: "Gangseo",
  발산: "Balsan",
  송파: "Songpa",
  서초: "Seocho",
  인천: "Incheon",
  부평: "Bupyeong",
  혜민: "Hyemin",
  하나: "Hana",
  밝음: "Bright",
  명동: "Myeongdong",
  분당: "Bundang",
  서현: "Seohyeon",
  점: "Branch",
  본점: "Main Branch",
}

const HOSPITAL_NAME_PHRASES = Object.keys(HOSPITAL_NAME_PHRASE_LABELS).sort((left, right) => right.length - left.length)
const HOSPITAL_NAME_MEDICAL_TERMS = /피부과|안과|치과|성형외과|정형외과|병원|의원|클리닉/g

function cleanLabel(value?: unknown) {
  const label = String(value ?? "").trim()
  return label && !EMPTY_REGION_FALLBACKS.has(label.toLowerCase()) ? label : ""
}

function normalizeProvinceLabel(value: string) {
  return PROVINCE_LABEL_ALIASES[value] ?? value
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    const label = cleanLabel(value)
    if (label) return label
  }
  return ""
}

function regionCodeToProvinceLabel(value: unknown, language: Language) {
  const provinceCode = String(value ?? "").trim().toUpperCase() as RegionProvinceCode
  const province = getRegionProvince(provinceCode)
  if (!province) return ""

  if (language === "en") {
    return PROVINCE_EN_LABELS[province.label.ko] ?? province.label.en
  }

  return province.label.ko
}

function formatEnglishRegionParts(parts: string[]) {
  if (parts.length <= 1) return parts[0] ?? ""
  return parts.join(", ")
}

function normalizeEnglishDistrict(value: string) {
  return value.replace(
    /^([A-Za-z]+(?:-[A-Za-z]+)*-si) ([A-Za-z]+(?:-[A-Za-z]+)*-(?:gu|gun))$/,
    "$1, $2"
  )
}

function hasKoreanText(value?: string) {
  return /[가-힣]/.test(value ?? "")
}

function titleCaseWords(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function romanizeHangulSyllable(char: string) {
  const code = char.charCodeAt(0) - 0xac00
  if (code < 0 || code > 11171) return char

  const initialIndex = Math.floor(code / 588)
  const vowelIndex = Math.floor((code % 588) / 28)
  const finalIndex = code % 28

  return `${HANGUL_INITIALS[initialIndex]}${HANGUL_VOWELS[vowelIndex]}${HANGUL_FINALS[finalIndex]}`
}

function replaceKnownHospitalNamePhrases(value: string) {
  let result = value
  for (const phrase of HOSPITAL_NAME_PHRASES) {
    result = result.replaceAll(phrase, ` ${HOSPITAL_NAME_PHRASE_LABELS[phrase]} `)
  }
  return result
}

function romanizeHospitalNameText(value: string) {
  const replaced = replaceKnownHospitalNamePhrases(value)
  return replaced
    .replace(/[가-힣]+/g, (word) => titleCaseWords([...word].map(romanizeHangulSyllable).join("")))
    .replace(/\s+/g, " ")
    .replace(/\s+([&'./-])\s+/g, " $1 ")
    .trim()
}

function categoryToEnglishClinicLabel(value?: unknown) {
  const text = String(value ?? "").trim().toLowerCase()
  if (["derma", "dermatology", "skin", "피부과"].includes(text)) return "Skin Clinic"
  if (["eye", "ophthalmology", "ophthalmic", "안과"].includes(text)) return "Eye Clinic"
  if (["dental", "dentistry", "dentist", "치과"].includes(text)) return "Dental Clinic"
  if (["orthopedics", "orthopedic", "정형외과"].includes(text)) return "Orthopedic Clinic"
  return "Clinic"
}

export function getEnglishHospitalNameFromKorean(value?: unknown, categoryLabel?: string) {
  const label = cleanLabel(value)
  if (!label) return ""
  if (!hasKoreanText(label)) return label

  const baseName = label
    .replace(/[()]/g, " ")
    .replace(HOSPITAL_NAME_MEDICAL_TERMS, " ")
    .replace(/\s+/g, " ")
    .trim()
  const romanizedBaseName = romanizeHospitalNameText(baseName || label)
  const resolvedCategoryLabel = categoryLabel || "Clinic"
  if (!romanizedBaseName) return resolvedCategoryLabel
  if (/\b(?:clinic|hospital|dental|eye|skin)\b/i.test(romanizedBaseName)) return romanizedBaseName

  return `${romanizedBaseName} ${resolvedCategoryLabel}`
}

export function formatHistoryRegionLabel(value?: unknown, language: Language = "ko") {
  const label = cleanLabel(value)
  if (!label || language !== "en") return label

  const koreanRegionLabel = getEnglishRegionLabelFromKorean(label)
  if (koreanRegionLabel) return koreanRegionLabel

  const provinceMatch = KOREA_REGION_OPTIONS
    .map((option) => {
      const displayLabel = PROVINCE_EN_LABELS[option.label.ko] ?? option.label.en
      const matchedPrefix = [displayLabel, option.label.en].find((prefix) => (
        label === prefix || label.startsWith(`${prefix} `)
      ))
      return matchedPrefix ? { displayLabel, matchedPrefix } : null
    })
    .find(Boolean)

  if (!provinceMatch) return normalizeEnglishDistrict(label)

  const district = label.slice(provinceMatch.matchedPrefix.length).trim()
  return district
    ? `${normalizeEnglishDistrict(district)}, ${provinceMatch.displayLabel}`
    : provinceMatch.displayLabel
}

export function extractRegionLabelFromAddress(address?: unknown) {
  const label = cleanLabel(address)
  if (!label) return ""

  const parts = label.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ""

  const normalizedParts = [...parts]
  normalizedParts[0] = normalizeProvinceLabel(normalizedParts[0])

  if (normalizedParts.length >= 3 && !METROPOLITAN_REGION_LABELS.has(normalizedParts[0])) {
    return normalizedParts.slice(0, 3).join(" ")
  }

  if (normalizedParts.length >= 2) {
    return normalizedParts.slice(0, 2).join(" ")
  }

  return normalizedParts[0]
}

export function getEnglishRegionLabelFromKorean(value?: unknown) {
  const regionLabel = extractRegionLabelFromAddress(value)
  if (!regionLabel) return ""

  const [provinceKo, ...districtParts] = regionLabel.split(/\s+/)
  const provinceEn = PROVINCE_EN_LABELS[provinceKo]
  if (!provinceEn) return ""

  const province = KOREA_REGION_OPTIONS.find((option) => option.label.ko === provinceKo)
  const districtKo = districtParts.join(" ")
  if (!districtKo) return provinceEn

  const exactDistrict = province?.districts.find((option) => option.label.ko === districtKo)
  if (exactDistrict) {
    return formatEnglishRegionParts([normalizeEnglishDistrict(exactDistrict.label.en), provinceEn])
  }

  const districtLabels = districtParts.map((part) => {
    const district = province?.districts.find((option) => option.label.ko === part)
    return district?.label.en ?? DISTRICT_EN_LABELS[part] ?? ""
  }).filter(Boolean)

  return districtLabels.length > 0 ? formatEnglishRegionParts([...districtLabels, provinceEn]) : provinceEn
}

function formatStoredRegionLabel(value: unknown, language: Language) {
  const label = cleanLabel(value)
  if (!label) return ""

  if (language === "en") {
    return getEnglishRegionLabelFromKorean(label) || formatHistoryRegionLabel(label, "en")
  }

  return extractRegionLabelFromAddress(label) || label
}

function getAddressRegionLabel(address: unknown, language: Language) {
  const regionLabel = extractRegionLabelFromAddress(address)
  if (!regionLabel) return ""

  return language === "en"
    ? getEnglishRegionLabelFromKorean(regionLabel) || regionLabel
    : regionLabel
}

function translateBranchLocationLabel(value: string) {
  let remaining = value.replace(/점$/, "")
  const labels: string[] = []

  while (remaining) {
    const matchedToken = BRANCH_LOCATION_TOKENS.find((token) => remaining.startsWith(token))
    if (!matchedToken) return ""
    labels.push(BRANCH_LOCATION_EN_LABELS[matchedToken])
    remaining = remaining.slice(matchedToken.length)
  }

  return labels.join(" ")
}

function getHospitalNameRegionLabel(record: HistoryDisplayRecord, language: Language) {
  const hospitalName = pickString(
    record.hospitalNameKo,
    record.hospital_name_ko,
    record.hospitalName,
    record.hospital_name
  )
  const branchMatch = hospitalName.match(/\s([가-힣A-Za-z0-9]+점)$/)
  if (!branchMatch) return ""

  const branchLabel = branchMatch[1]
  if (language === "en") {
    return translateBranchLocationLabel(branchLabel) || branchLabel
  }

  return branchLabel
}

export function isEmptyRegionFallback(value?: unknown) {
  return !cleanLabel(value)
}

export function getHistoryHospitalName(record: HistoryDisplayRecord, language: Language) {
  if (language === "en") {
    const englishName = pickString(
      record.hospitalEnglishName,
      record.hospital_english_name,
      record.hospitalNameEn,
      record.hospital_name_en,
      record.englishName,
      record.english_name
    )
    if (englishName) return englishName

    const koreanName = pickString(
      record.hospitalNameKo,
      record.hospital_name_ko,
      record.hospitalName,
      record.hospital_name
    )
    const categoryLabel = pickString(record.categoryEnLabel, record.category_en_label) || categoryToEnglishClinicLabel(record.category)

    return getEnglishHospitalNameFromKorean(koreanName, categoryLabel) || koreanName
  }

  return pickString(
    record.hospitalNameKo,
    record.hospital_name_ko,
    record.hospitalName,
    record.hospital_name
  )
}

export function getHistoryRegionLabel(record: HistoryDisplayRecord, language: Language) {
  const preferredLabel = language === "en"
    ? pickString(record.regionEnLabel, record.region_en_label)
    : pickString(record.regionKoLabel, record.region_ko_label)
  const alternateLabel = language === "en"
    ? pickString(record.regionKoLabel, record.region_ko_label)
    : pickString(record.regionEnLabel, record.region_en_label)
  const regionProvinceCode = pickString(record.regionProvinceCode, record.region_province_code)
  const regionDistrictCode = pickString(record.regionDistrictCode, record.region_district_code)
  const regionFromCodes = regionProvinceCode
    ? getRegionLabel(regionProvinceCode as RegionProvinceCode, regionDistrictCode, language)
    : ""
  const regionId = pickString(record.regionId, record.region_id)
  const regionFromId = regionId.includes(":")
    ? (() => {
        const [provinceCode, districtCode = ""] = regionId.split(":")
        return getRegionLabel(provinceCode as RegionProvinceCode, districtCode, language)
      })()
    : ""
  const rawRegion = pickString(record.hospitalRegion, record.hospital_region, record.region)
  const provinceLabel = regionCodeToProvinceLabel(rawRegion, language)
  const rawRegionLabel = provinceLabel ? "" : rawRegion

  return (
    formatHistoryRegionLabel(preferredLabel, language) ||
    formatHistoryRegionLabel(regionFromCodes, language) ||
    formatHistoryRegionLabel(regionFromId, language) ||
    formatStoredRegionLabel(alternateLabel, language) ||
    formatStoredRegionLabel(pickString(record.regionLabel, record.region_label), language) ||
    getAddressRegionLabel(pickString(record.hospitalAddress, record.hospital_address), language) ||
    getAddressRegionLabel(pickString(record.roadAddress, record.road_address, record.address, record.location), language) ||
    formatHistoryRegionLabel(provinceLabel, language) ||
    formatStoredRegionLabel(rawRegionLabel, language) ||
    getHospitalNameRegionLabel(record, language)
  )
}

export function getHistoryCategoryLabel(
  record: HistoryDisplayRecord,
  language: Language,
  fallbackLabel: string
) {
  const label = language === "en"
    ? pickString(record.categoryEnLabel, record.category_en_label)
    : pickString(record.categoryKoLabel, record.category_ko_label)

  return label || fallbackLabel
}

export function getHistoryMetaText(record: HistoryDisplayRecord, language: Language, fallbackCategoryLabel: string) {
  const metaItems = [getHistoryCategoryLabel(record, language, fallbackCategoryLabel)]
  const regionLabel = getHistoryRegionLabel(record, language)

  if (regionLabel) {
    metaItems.push(regionLabel)
  }

  return metaItems.join(" · ")
}
