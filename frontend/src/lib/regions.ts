import type { Language } from "@/lib/types"

export const SELECTED_REGION_STORAGE_KEY = "filtory-selected-region"

export const KOREA_REGION_OPTIONS = [
  {
    code: "SEOUL",
    label: { ko: "서울", en: "Seoul" },
    districts: [
      { code: "GANGNAM_GU", label: { ko: "강남구", en: "Gangnam-gu" } },
      { code: "SEOCHO_GU", label: { ko: "서초구", en: "Seocho-gu" } },
      { code: "SONGPA_GU", label: { ko: "송파구", en: "Songpa-gu" } },
      { code: "MAPO_GU", label: { ko: "마포구", en: "Mapo-gu" } },
      { code: "JONGNO_GU", label: { ko: "종로구", en: "Jongno-gu" } },
      { code: "JUNG_GU", label: { ko: "중구", en: "Jung-gu" } },
      { code: "YONGSAN_GU", label: { ko: "용산구", en: "Yongsan-gu" } },
      { code: "SEONGDONG_GU", label: { ko: "성동구", en: "Seongdong-gu" } },
      { code: "GWANGJIN_GU", label: { ko: "광진구", en: "Gwangjin-gu" } },
      { code: "DONGDAEMUN_GU", label: { ko: "동대문구", en: "Dongdaemun-gu" } },
      { code: "YEONGDEUNGPO_GU", label: { ko: "영등포구", en: "Yeongdeungpo-gu" } },
    ],
  },
  {
    code: "GYEONGGI",
    label: { ko: "경기", en: "Gyeonggi" },
    districts: [
      { code: "SUWON_SI", label: { ko: "수원시", en: "Suwon-si" } },
      { code: "SEONGNAM_SI", label: { ko: "성남시", en: "Seongnam-si" } },
      { code: "ANYANG_DONGAN_GU", label: { ko: "안양시 동안구", en: "Anyang-si Dongan-gu" } },
      { code: "ANYANG_MANAN_GU", label: { ko: "안양시 만안구", en: "Anyang-si Manan-gu" } },
      { code: "GOYANG_SI", label: { ko: "고양시", en: "Goyang-si" } },
      { code: "YONGIN_SI", label: { ko: "용인시", en: "Yongin-si" } },
      { code: "BUCHEON_SI", label: { ko: "부천시", en: "Bucheon-si" } },
      { code: "HWASEONG_SI", label: { ko: "화성시", en: "Hwaseong-si" } },
      { code: "NAMYANGJU_SI", label: { ko: "남양주시", en: "Namyangju-si" } },
      { code: "PYEONGTAEK_SI", label: { ko: "평택시", en: "Pyeongtaek-si" } },
      { code: "ANSAN_SI", label: { ko: "안산시", en: "Ansan-si" } },
    ],
  },
  {
    code: "INCHEON",
    label: { ko: "인천", en: "Incheon" },
    districts: [
      { code: "MICHUHOL_GU", label: { ko: "미추홀구", en: "Michuhol-gu" } },
      { code: "YEONSU_GU", label: { ko: "연수구", en: "Yeonsu-gu" } },
      { code: "NAMDONG_GU", label: { ko: "남동구", en: "Namdong-gu" } },
      { code: "BUPYEONG_GU", label: { ko: "부평구", en: "Bupyeong-gu" } },
      { code: "GYEYANG_GU", label: { ko: "계양구", en: "Gyeyang-gu" } },
      { code: "SEO_GU", label: { ko: "서구", en: "Seo-gu" } },
    ],
  },
  {
    code: "BUSAN",
    label: { ko: "부산", en: "Busan" },
    districts: [
      { code: "HAEUNDAE_GU", label: { ko: "해운대구", en: "Haeundae-gu" } },
      { code: "BUSANJIN_GU", label: { ko: "부산진구", en: "Busanjin-gu" } },
      { code: "SUYEONG_GU", label: { ko: "수영구", en: "Suyeong-gu" } },
      { code: "DONGNAE_GU", label: { ko: "동래구", en: "Dongnae-gu" } },
      { code: "NAM_GU", label: { ko: "남구", en: "Nam-gu" } },
      { code: "YEONJE_GU", label: { ko: "연제구", en: "Yeonje-gu" } },
    ],
  },
  {
    code: "DAEGU",
    label: { ko: "대구", en: "Daegu" },
    districts: [
      { code: "JUNG_GU", label: { ko: "중구", en: "Jung-gu" } },
      { code: "DONG_GU", label: { ko: "동구", en: "Dong-gu" } },
      { code: "SEO_GU", label: { ko: "서구", en: "Seo-gu" } },
      { code: "NAM_GU", label: { ko: "남구", en: "Nam-gu" } },
      { code: "BUK_GU", label: { ko: "북구", en: "Buk-gu" } },
      { code: "SUSEONG_GU", label: { ko: "수성구", en: "Suseong-gu" } },
      { code: "DALSEO_GU", label: { ko: "달서구", en: "Dalseo-gu" } },
    ],
  },
  {
    code: "DAEJEON",
    label: { ko: "대전", en: "Daejeon" },
    districts: [
      { code: "DONG_GU", label: { ko: "동구", en: "Dong-gu" } },
      { code: "JUNG_GU", label: { ko: "중구", en: "Jung-gu" } },
      { code: "SEO_GU", label: { ko: "서구", en: "Seo-gu" } },
      { code: "YUSEONG_GU", label: { ko: "유성구", en: "Yuseong-gu" } },
      { code: "DAEDEOK_GU", label: { ko: "대덕구", en: "Daedeok-gu" } },
    ],
  },
  {
    code: "GWANGJU",
    label: { ko: "광주", en: "Gwangju" },
    districts: [
      { code: "DONG_GU", label: { ko: "동구", en: "Dong-gu" } },
      { code: "SEO_GU", label: { ko: "서구", en: "Seo-gu" } },
      { code: "NAM_GU", label: { ko: "남구", en: "Nam-gu" } },
      { code: "BUK_GU", label: { ko: "북구", en: "Buk-gu" } },
      { code: "GWANGSAN_GU", label: { ko: "광산구", en: "Gwangsan-gu" } },
    ],
  },
  {
    code: "ULSAN",
    label: { ko: "울산", en: "Ulsan" },
    districts: [
      { code: "JUNG_GU", label: { ko: "중구", en: "Jung-gu" } },
      { code: "NAM_GU", label: { ko: "남구", en: "Nam-gu" } },
      { code: "DONG_GU", label: { ko: "동구", en: "Dong-gu" } },
      { code: "BUK_GU", label: { ko: "북구", en: "Buk-gu" } },
      { code: "ULJU_GUN", label: { ko: "울주군", en: "Ulju-gun" } },
    ],
  },
  {
    code: "SEJONG",
    label: { ko: "세종", en: "Sejong" },
    districts: [
      { code: "SEJONG_SI", label: { ko: "세종시", en: "Sejong-si" } },
    ],
  },
  {
    code: "GANGWON",
    label: { ko: "강원", en: "Gangwon" },
    districts: [
      { code: "CHUNCHEON_SI", label: { ko: "춘천시", en: "Chuncheon-si" } },
      { code: "WONJU_SI", label: { ko: "원주시", en: "Wonju-si" } },
      { code: "GANGNEUNG_SI", label: { ko: "강릉시", en: "Gangneung-si" } },
      { code: "SOKCHO_SI", label: { ko: "속초시", en: "Sokcho-si" } },
    ],
  },
  {
    code: "CHUNGBUK",
    label: { ko: "충북", en: "Chungbuk" },
    districts: [
      { code: "CHEONGJU_SI", label: { ko: "청주시", en: "Cheongju-si" } },
      { code: "CHUNGJU_SI", label: { ko: "충주시", en: "Chungju-si" } },
      { code: "JECHEON_SI", label: { ko: "제천시", en: "Jecheon-si" } },
    ],
  },
  {
    code: "CHUNGNAM",
    label: { ko: "충남", en: "Chungnam" },
    districts: [
      { code: "CHEONAN_SI", label: { ko: "천안시", en: "Cheonan-si" } },
      { code: "ASAN_SI", label: { ko: "아산시", en: "Asan-si" } },
      { code: "SEOSAN_SI", label: { ko: "서산시", en: "Seosan-si" } },
      { code: "NONSAN_SI", label: { ko: "논산시", en: "Nonsan-si" } },
    ],
  },
  {
    code: "JEONBUK",
    label: { ko: "전북", en: "Jeonbuk" },
    districts: [
      { code: "JEONJU_SI", label: { ko: "전주시", en: "Jeonju-si" } },
      { code: "GUNSAN_SI", label: { ko: "군산시", en: "Gunsan-si" } },
      { code: "IKSAN_SI", label: { ko: "익산시", en: "Iksan-si" } },
      { code: "JEONGEUP_SI", label: { ko: "정읍시", en: "Jeongeup-si" } },
    ],
  },
  {
    code: "JEONNAM",
    label: { ko: "전남", en: "Jeonnam" },
    districts: [
      { code: "MOKPO_SI", label: { ko: "목포시", en: "Mokpo-si" } },
      { code: "YEOSU_SI", label: { ko: "여수시", en: "Yeosu-si" } },
      { code: "SUNCHEON_SI", label: { ko: "순천시", en: "Suncheon-si" } },
      { code: "NAJU_SI", label: { ko: "나주시", en: "Naju-si" } },
    ],
  },
  {
    code: "GYEONGBUK",
    label: { ko: "경북", en: "Gyeongbuk" },
    districts: [
      { code: "POHANG_SI", label: { ko: "포항시", en: "Pohang-si" } },
      { code: "GYEONGJU_SI", label: { ko: "경주시", en: "Gyeongju-si" } },
      { code: "GUMI_SI", label: { ko: "구미시", en: "Gumi-si" } },
      { code: "GYEONGSAN_SI", label: { ko: "경산시", en: "Gyeongsan-si" } },
    ],
  },
  {
    code: "GYEONGNAM",
    label: { ko: "경남", en: "Gyeongnam" },
    districts: [
      { code: "CHANGWON_SI", label: { ko: "창원시", en: "Changwon-si" } },
      { code: "GIMHAE_SI", label: { ko: "김해시", en: "Gimhae-si" } },
      { code: "JINJU_SI", label: { ko: "진주시", en: "Jinju-si" } },
      { code: "YANGSAN_SI", label: { ko: "양산시", en: "Yangsan-si" } },
    ],
  },
  {
    code: "JEJU",
    label: { ko: "제주", en: "Jeju" },
    districts: [
      { code: "JEJU_SI", label: { ko: "제주시", en: "Jeju-si" } },
      { code: "SEOGWIPO_SI", label: { ko: "서귀포시", en: "Seogwipo-si" } },
    ],
  },
] as const

export type RegionProvince = (typeof KOREA_REGION_OPTIONS)[number]
export type RegionProvinceCode = RegionProvince["code"]
export type RegionDistrict = RegionProvince["districts"][number]
export type RegionDistrictCode = RegionDistrict["code"]

export function getRegionProvince(code: RegionProvinceCode | "") {
  return KOREA_REGION_OPTIONS.find((province) => province.code === code)
}

export function getRegionDistrict(provinceCode: RegionProvinceCode | "", districtCode: string) {
  return getRegionProvince(provinceCode)?.districts.find((district) => district.code === districtCode)
}

export function getRegionLabel(
  provinceCode: RegionProvinceCode | "",
  districtCode: string,
  language: Language
) {
  const province = getRegionProvince(provinceCode)
  if (!province) return ""

  const district = getRegionDistrict(provinceCode, districtCode)
  return district ? `${province.label[language]} ${district.label[language]}` : province.label[language]
}

export function matchesRegionText(region: { label: { ko: string; en: string } }, keyword: string) {
  const query = keyword.trim().toLowerCase()
  if (!query) return true
  return region.label.ko.toLowerCase().includes(query) || region.label.en.toLowerCase().includes(query)
}
