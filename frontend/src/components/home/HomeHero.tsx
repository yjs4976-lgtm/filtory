"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, Search, Sparkles, X } from "lucide-react"
import { CategorySelector } from "@/components/review/CategorySelector"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import type { HospitalCategory } from "@/lib/types"
import styles from "@/styles/App.module.css"

type AnalyzeMode = "hospital" | "url"

const KOREA_REGION_OPTIONS = {
  서울: ["강남구", "서초구", "송파구", "마포구", "종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "영등포구"],
  경기: ["수원시", "성남시", "안양시 동안구", "안양시 만안구", "고양시", "용인시", "부천시", "화성시", "남양주시", "평택시", "안산시"],
  인천: ["미추홀구", "연수구", "남동구", "부평구", "계양구", "서구"],
  부산: ["해운대구", "부산진구", "수영구", "동래구", "남구", "연제구"],
  대구: ["중구", "동구", "서구", "남구", "북구", "수성구", "달서구"],
  대전: ["동구", "중구", "서구", "유성구", "대덕구"],
  광주: ["동구", "서구", "남구", "북구", "광산구"],
  울산: ["중구", "남구", "동구", "북구", "울주군"],
  세종: ["세종시"],
  강원: ["춘천시", "원주시", "강릉시", "속초시"],
  충북: ["청주시", "충주시", "제천시"],
  충남: ["천안시", "아산시", "서산시", "논산시"],
  전북: ["전주시", "군산시", "익산시", "정읍시"],
  전남: ["목포시", "여수시", "순천시", "나주시"],
  경북: ["포항시", "경주시", "구미시", "경산시"],
  경남: ["창원시", "김해시", "진주시", "양산시"],
  제주: ["제주시", "서귀포시"],
} as const

type Province = keyof typeof KOREA_REGION_OPTIONS
type DistrictSearchResult = {
  province: Province
  district: string
  label: string
}

const PROVINCE_OPTIONS = Object.keys(KOREA_REGION_OPTIONS) as Province[]
const REGION_SEARCH_RESULTS = PROVINCE_OPTIONS.flatMap((province) =>
  KOREA_REGION_OPTIONS[province].map((district) => ({
    province,
    district,
    label: `${province} ${district}`,
  }))
)

export function HomeHero() {
  const router = useRouter()
  const { t } = useLanguage()
  const [category, setCategory] = useState<HospitalCategory>("derma")
  const [mode, setMode] = useState<AnalyzeMode>("hospital")
  const [hospitalName, setHospitalName] = useState("")
  const [region, setRegion] = useState("")
  const [naverUrl, setNaverUrl] = useState("")
  const [isRegionSheetOpen, setIsRegionSheetOpen] = useState(false)
  const [regionSearch, setRegionSearch] = useState("")
  const [selectedProvince, setSelectedProvince] = useState<Province | "">("")
  const [selectedDistrict, setSelectedDistrict] = useState("")
  const regionSearchRef = useRef<HTMLInputElement>(null)

  const trimmedRegionSearch = regionSearch.trim()
  const filteredProvinces = useMemo(() => {
    if (!trimmedRegionSearch) return PROVINCE_OPTIONS
    return PROVINCE_OPTIONS.filter((province) => province.includes(trimmedRegionSearch))
  }, [trimmedRegionSearch])
  const districtOptions = selectedProvince ? KOREA_REGION_OPTIONS[selectedProvince] : []
  const filteredDistricts = useMemo<DistrictSearchResult[]>(() => {
    if (!trimmedRegionSearch) {
      if (!selectedProvince) return []
      return KOREA_REGION_OPTIONS[selectedProvince].map((district) => ({
        province: selectedProvince,
        district,
        label: `${selectedProvince} ${district}`,
      }))
    }

    return REGION_SEARCH_RESULTS.filter(({ province, district, label }) =>
      province.includes(trimmedRegionSearch) ||
      district.includes(trimmedRegionSearch) ||
      label.includes(trimmedRegionSearch)
    )
  }, [selectedProvince, trimmedRegionSearch])
  const hasRegionSearchResults = filteredProvinces.length > 0 || filteredDistricts.length > 0
  const selectedRegionLabel = selectedProvince
    ? selectedDistrict
      ? `${selectedProvince} ${selectedDistrict}`
      : selectedProvince
    : ""

  useEffect(() => {
    if (!isRegionSheetOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    regionSearchRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsRegionSheetOpen(false)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [isRegionSheetOpen])

  function startAnalyze() {
    const params = new URLSearchParams()
    params.set("category", category)
    if (mode === "hospital") {
      if (hospitalName.trim()) params.set("hospital", hospitalName.trim())
      if (region.trim()) params.set("region", region.trim())
    }
    if (mode === "url" && naverUrl.trim()) params.set("naver", naverUrl.trim())
    router.push(`${ROUTES.ANALYZE}?${params.toString()}`)
  }

  function openRegionSheet() {
    setRegionSearch("")
    setIsRegionSheetOpen(true)
  }

  function selectProvince(nextProvince: Province) {
    setSelectedProvince(nextProvince)
    setSelectedDistrict("")
    setRegion(nextProvince)
    setRegionSearch("")
  }

  function resetProvinceSelection() {
    setSelectedProvince("")
    setSelectedDistrict("")
    setRegion("")
    setRegionSearch("")
  }

  function selectDistrict(nextProvince: Province, nextDistrict: string) {
    const nextRegion = `${nextProvince} ${nextDistrict}`
    setSelectedProvince(nextProvince)
    setSelectedDistrict(nextDistrict)
    setRegion(nextRegion)
    setIsRegionSheetOpen(false)
  }

  function renderProvinceButton(option: Province) {
    const isSelected = selectedProvince === option

    return (
      <button
        key={option}
        type="button"
        role="option"
        className={`${styles.regionOptionButton} ${isSelected ? styles.regionOptionSelected : ""}`}
        aria-selected={isSelected}
        aria-label={`${t.home.regionPicker.provinceTitle}: ${option}`}
        onClick={() => selectProvince(option)}
      >
        <span>{option}</span>
        {isSelected ? <Check className={styles.iconSm} aria-hidden="true" /> : null}
      </button>
    )
  }

  function renderDistrictButton({ province, district, label }: DistrictSearchResult) {
    const isSelected = selectedProvince === province && selectedDistrict === district
    const displayLabel = trimmedRegionSearch ? label : district

    return (
      <button
        key={label}
        type="button"
        role="option"
        className={`${styles.regionOptionButton} ${isSelected ? styles.regionOptionSelected : ""}`}
        aria-selected={isSelected}
        aria-label={`${t.home.regionPicker.districtTitle}: ${label}`}
        onClick={() => selectDistrict(province, district)}
      >
        <span>{displayLabel}</span>
        {isSelected ? <Check className={styles.iconSm} aria-hidden="true" /> : null}
      </button>
    )
  }

  return (
    <>
      <section className={`${styles.heroCard} ${styles.stackMd}`}>
        <div className={styles.stackSm}>
          <span className={`${styles.iconBox} ${styles.iconLavender}`}>
            <Sparkles className={styles.iconMd} />
          </span>
          <h1 className={styles.heroTitle}>{t.home.heroTitle}</h1>
          <p className={styles.bodyText}>{t.home.heroDescription}</p>
        </div>

        <div className={styles.homeModeToggle} role="tablist" aria-label={t.home.analyzeModeLabel}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "hospital"}
            className={mode === "hospital" ? styles.homeModeActive : ""}
            onClick={() => setMode("hospital")}
          >
            {t.home.searchByHospital}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "url"}
            className={mode === "url" ? styles.homeModeActive : ""}
            onClick={() => setMode("url")}
          >
            {t.home.analyzeByUrl}
          </button>
        </div>

        <div className={styles.homeFormGroup}>
          <p className={styles.homeFieldLabel}>{t.home.selectCategory}</p>
          <CategorySelector selected={category} onSelect={setCategory} variant="pills" />
        </div>

        {mode === "hospital" ? (
          <div className={styles.heroInputGrid}>
            <input
              className={styles.input}
              value={hospitalName}
              onChange={(event) => setHospitalName(event.target.value)}
              placeholder={t.home.hospitalPlaceholder}
            />
            <div className={`${styles.regionSelectField} ${isRegionSheetOpen ? styles.regionSelectFieldOpen : ""}`}>
              <input
                className={styles.input}
                value={region}
                readOnly
                aria-label={t.home.regionPicker.inputAriaLabel}
                aria-haspopup="dialog"
                onClick={openRegionSheet}
                onFocus={openRegionSheet}
                placeholder={t.home.regionPlaceholder}
              />
              <ChevronDown className={styles.regionSelectChevron} aria-hidden="true" />
            </div>
          </div>
        ) : (
          <input
            className={styles.input}
            value={naverUrl}
            onChange={(event) => setNaverUrl(event.target.value)}
            placeholder={t.home.naverUrlPlaceholder}
          />
        )}

        <button type="button" className={styles.primaryButton} onClick={startAnalyze}>
          <Search className={styles.iconSm} />
          {t.home.startAnalysis}
        </button>
      </section>

      {isRegionSheetOpen ? (
        <div className={styles.regionSheetBackdrop} role="presentation" onClick={() => setIsRegionSheetOpen(false)}>
          <section
            className={styles.regionSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-region-sheet-title"
            aria-describedby="home-region-sheet-description"
            onClick={(event) => event.stopPropagation()}
          >
            <span className={styles.sheetHandle} aria-hidden="true" />
            <div className={styles.regionSheetHeader}>
              <div>
                <h2 id="home-region-sheet-title" className={styles.regionSheetTitle}>{t.home.regionPicker.title}</h2>
                <p id="home-region-sheet-description">{t.home.regionPicker.description}</p>
              </div>
              <button type="button" className={styles.regionSheetCloseButton} aria-label={t.home.regionPicker.closeAriaLabel} onClick={() => setIsRegionSheetOpen(false)}>
                <X className={styles.iconMd} />
              </button>
            </div>

            <label className={styles.regionSearchField}>
              <Search className={styles.iconSm} aria-hidden="true" />
              <input
                ref={regionSearchRef}
                value={regionSearch}
                onChange={(event) => setRegionSearch(event.target.value)}
                placeholder={t.home.regionPicker.searchPlaceholder}
              />
            </label>

            {selectedProvince ? (
              <section className={styles.regionSummary} aria-label={t.home.regionPicker.selectedTitle}>
                <div>
                  <p className={styles.regionSummaryLabel}>{t.home.regionPicker.selectedTitle}</p>
                  <div className={styles.regionSummaryChips}>
                    <span className={styles.regionSummaryChip}>{selectedRegionLabel}</span>
                  </div>
                </div>
                <button type="button" className={styles.regionBackButton} onClick={resetProvinceSelection}>
                  {t.home.regionPicker.changeProvince}
                </button>
              </section>
            ) : null}

            <div className={styles.regionSheetBody}>
              {trimmedRegionSearch ? (
                hasRegionSearchResults ? (
                  <>
                    {filteredProvinces.length > 0 ? (
                      <div className={styles.regionSection}>
                        <h3>{t.home.regionPicker.provinceTitle}</h3>
                        <div className={styles.regionOptionGrid}>{filteredProvinces.map(renderProvinceButton)}</div>
                      </div>
                    ) : null}
                    {filteredDistricts.length > 0 ? (
                      <div className={styles.regionSection}>
                        <h3>{t.home.regionPicker.districtTitle}</h3>
                        <div className={styles.regionOptionGrid}>{filteredDistricts.map(renderDistrictButton)}</div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className={styles.regionNoResults}>{t.home.regionPicker.noResults}</p>
                )
              ) : (
                <>
                  {selectedProvince ? (
                    <div className={styles.regionSection}>
                      <h3>{t.home.regionPicker.selectDistrictTitle}</h3>
                      <div className={styles.regionOptionGrid}>{districtOptions.map((district) => renderDistrictButton({
                        province: selectedProvince,
                        district,
                        label: `${selectedProvince} ${district}`,
                      }))}</div>
                    </div>
                  ) : (
                    <div className={styles.regionSection}>
                      <h3>{t.home.regionPicker.selectProvinceTitle}</h3>
                      <div className={styles.regionOptionGrid}>{PROVINCE_OPTIONS.map(renderProvinceButton)}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
