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

const METROPOLITAN_REGION_LABELS = new Set(["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종"])

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

export function formatHistoryRegionLabel(value?: unknown, language: Language = "ko") {
  const label = cleanLabel(value)
  if (!label || language !== "en") return label

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
    return district?.label.en ?? ""
  }).filter(Boolean)

  return districtLabels.length > 0 ? formatEnglishRegionParts([...districtLabels, provinceEn]) : ""
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

export function isEmptyRegionFallback(value?: unknown) {
  return !cleanLabel(value)
}

export function getHistoryHospitalName(record: HistoryDisplayRecord, language: Language) {
  if (language === "en") {
    return pickString(
      record.hospitalEnglishName,
      record.hospital_english_name,
      record.hospitalNameEn,
      record.hospital_name_en,
      record.englishName,
      record.english_name,
      record.hospitalNameKo,
      record.hospital_name_ko,
      record.hospitalName,
      record.hospital_name
    )
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
    formatStoredRegionLabel(rawRegionLabel, language)
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
