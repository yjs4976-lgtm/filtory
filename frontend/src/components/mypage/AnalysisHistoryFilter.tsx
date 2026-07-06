"use client"

import { X } from "lucide-react"
import type { HospitalCategory } from "@/lib/types"
import type { AnalysisHistorySort, TrustFilter } from "@/services/analysisHistoryService"
import { useLanguage } from "@/context/LanguageContext"
import { TRUST_LEVEL_STANDARDS } from "@/lib/score"
import styles from "@/styles/App.module.css"

interface AnalysisHistoryFilterProps {
  keyword: string
  category: "all" | HospitalCategory
  trust: TrustFilter
  sort: AnalysisHistorySort
  onKeywordChange: (value: string, isComposing?: boolean) => void
  onCategoryChange: (value: "all" | HospitalCategory) => void
  onTrustChange: (value: TrustFilter) => void
  onSortChange: (value: AnalysisHistorySort) => void
  onResetSearch: () => void
}

export function AnalysisHistoryFilter({
  keyword,
  category,
  trust,
  sort,
  onKeywordChange,
  onCategoryChange,
  onTrustChange,
  onSortChange,
  onResetSearch,
}: AnalysisHistoryFilterProps) {
  const { t } = useLanguage()

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <label className={styles.label} htmlFor="history-keyword">
        {t.mypage.searchHospitalName}
        <span className={styles.searchInputField}>
          <input
            id="history-keyword"
            className={styles.input}
            value={keyword}
            placeholder={t.mypage.searchHospitalNamePlaceholder}
            onChange={(event) => {
              if ((event.nativeEvent as InputEvent).isComposing) {
                onKeywordChange(event.target.value, true)
                return
              }
              onKeywordChange(event.target.value)
            }}
            onCompositionEnd={(event) => onKeywordChange(event.currentTarget.value)}
          />
          {keyword && (
            <button type="button" className={styles.searchClearButton} aria-label={t.history.resetSearch} onClick={onResetSearch}>
              <X className={styles.iconXs} />
            </button>
          )}
        </span>
      </label>
      <div className={styles.filterGrid}>
        <label className={styles.label}>
          {t.mypage.category}
          <select className={styles.input} value={category} onChange={(event) => onCategoryChange(event.target.value as "all" | HospitalCategory)}>
            <option value="all">{t.mypage.all}</option>
            <option value="derma">{t.categories.derma}</option>
            <option value="eye">{t.categories.eye}</option>
            <option value="dental">{t.categories.dental}</option>
          </select>
        </label>
        <label className={styles.label}>
          {t.mypage.trustLevelLabel}
          <select className={styles.input} value={trust} onChange={(event) => onTrustChange(event.target.value as TrustFilter)}>
            <option value="all">{t.mypage.all}</option>
            {TRUST_LEVEL_STANDARDS.map((level) => (
              <option key={level.key} value={level.key}>
                {t.trustLevels[level.key]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.label}>
          {t.mypage.sort}
          <select className={styles.input} value={sort} onChange={(event) => onSortChange(event.target.value as AnalysisHistorySort)}>
            <option value="latest">{t.mypage.latestSort}</option>
            <option value="oldest">{t.mypage.oldestSort}</option>
            <option value="trust">{t.mypage.trustSort}</option>
            <option value="ad">{t.mypage.adSort}</option>
          </select>
        </label>
      </div>
    </section>
  )
}
