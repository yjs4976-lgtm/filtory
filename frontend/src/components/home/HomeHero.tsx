"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, Search, Sparkles, X } from "lucide-react"
import { CategorySelector } from "@/components/review/CategorySelector"
import { useLanguage } from "@/context/LanguageContext"
import {
  KOREA_REGION_OPTIONS,
  getRegionLabel,
  matchesRegionText,
  type RegionDistrict,
  type RegionProvince,
  type RegionProvinceCode,
} from "@/lib/regions"
import { ROUTES } from "@/lib/routes"
import type { HospitalCategory, Language } from "@/lib/types"
import styles from "@/styles/App.module.css"

type AnalyzeMode = "hospital" | "url"

type DistrictSearchResult = {
  province: RegionProvince
  district: RegionDistrict
}

const REGION_SEARCH_RESULTS = KOREA_REGION_OPTIONS.flatMap((province) =>
  province.districts.map((district) => ({
    province,
    district,
  }))
)

export function HomeHero() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const currentLanguage: Language = language === "en" ? "en" : "ko"
  const [category, setCategory] = useState<HospitalCategory>("derma")
  const [mode, setMode] = useState<AnalyzeMode>("hospital")
  const [hospitalName, setHospitalName] = useState("")
  const [naverUrl, setNaverUrl] = useState("")
  const [isRegionSheetOpen, setIsRegionSheetOpen] = useState(false)
  const [regionSearch, setRegionSearch] = useState("")
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<RegionProvinceCode | "">("")
  const [selectedDistrictCode, setSelectedDistrictCode] = useState("")
  const regionSearchRef = useRef<HTMLInputElement>(null)

  const trimmedRegionSearch = regionSearch.trim()
  const filteredProvinces = trimmedRegionSearch
    ? KOREA_REGION_OPTIONS.filter((province) => matchesRegionText(province, trimmedRegionSearch))
    : KOREA_REGION_OPTIONS
  const selectedProvince = KOREA_REGION_OPTIONS.find((province) => province.code === selectedProvinceCode)
  const districtOptions = selectedProvince?.districts ?? []
  const filteredDistricts: DistrictSearchResult[] = trimmedRegionSearch
    ? REGION_SEARCH_RESULTS.filter(({ province, district }) =>
        matchesRegionText(province, trimmedRegionSearch) || matchesRegionText(district, trimmedRegionSearch)
      )
    : selectedProvince?.districts.map((district) => ({
        province: selectedProvince,
        district,
      })) ?? []
  const hasRegionSearchResults = filteredProvinces.length > 0 || filteredDistricts.length > 0
  const selectedRegionLabel = getRegionLabel(selectedProvinceCode, selectedDistrictCode, currentLanguage)

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
      if (selectedRegionLabel.trim()) params.set("region", selectedRegionLabel.trim())
    }
    if (mode === "url" && naverUrl.trim()) params.set("naver", naverUrl.trim())
    router.push(`${ROUTES.ANALYZE}?${params.toString()}`)
  }

  function openRegionSheet() {
    setRegionSearch("")
    setIsRegionSheetOpen(true)
  }

  function selectProvince(nextProvince: RegionProvince) {
    setSelectedProvinceCode(nextProvince.code)
    setSelectedDistrictCode("")
    setRegionSearch("")
  }

  function resetProvinceSelection() {
    setSelectedProvinceCode("")
    setSelectedDistrictCode("")
    setRegionSearch("")
  }

  function selectDistrict(nextProvince: RegionProvince, nextDistrict: RegionDistrict) {
    setSelectedProvinceCode(nextProvince.code)
    setSelectedDistrictCode(nextDistrict.code)
    setIsRegionSheetOpen(false)
  }

  function renderProvinceButton(option: RegionProvince) {
    const label = option.label[currentLanguage]
    const isSelected = selectedProvinceCode === option.code

    return (
      <button
        key={option.code}
        type="button"
        role="option"
        className={`${styles.regionOptionButton} ${isSelected ? styles.regionOptionSelected : ""}`}
        aria-selected={isSelected}
        aria-label={`${t.home.regionPicker.provinceTitle}: ${label}`}
        onClick={() => selectProvince(option)}
      >
        <span>{label}</span>
        {isSelected ? <Check className={styles.iconSm} aria-hidden="true" /> : null}
      </button>
    )
  }

  function renderDistrictButton({ province, district }: DistrictSearchResult) {
    const provinceLabel = province.label[currentLanguage]
    const districtLabel = district.label[currentLanguage]
    const isSelected = selectedProvinceCode === province.code && selectedDistrictCode === district.code
    const displayLabel = trimmedRegionSearch ? `${provinceLabel} ${districtLabel}` : districtLabel

    return (
      <button
        key={`${province.code}-${district.code}`}
        type="button"
        role="option"
        className={`${styles.regionOptionButton} ${isSelected ? styles.regionOptionSelected : ""}`}
        aria-selected={isSelected}
        aria-label={`${t.home.regionPicker.districtTitle}: ${provinceLabel} ${districtLabel}`}
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
                value={selectedRegionLabel}
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
                      }))}</div>
                    </div>
                  ) : (
                    <div className={styles.regionSection}>
                      <h3>{t.home.regionPicker.selectProvinceTitle}</h3>
                      <div className={styles.regionOptionGrid}>{KOREA_REGION_OPTIONS.map(renderProvinceButton)}</div>
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
