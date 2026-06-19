"use client"

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
  onKeywordChange: (value: string) => void
  onCategoryChange: (value: "all" | HospitalCategory) => void
  onTrustChange: (value: TrustFilter) => void
  onSortChange: (value: AnalysisHistorySort) => void
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
}: AnalysisHistoryFilterProps) {
  const { t } = useLanguage()

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <label className={styles.label} htmlFor="history-keyword">
        {t.mypage.searchHospitalName}
        <input
          id="history-keyword"
          className={styles.input}
          value={keyword}
          placeholder={t.mypage.searchHospitalNamePlaceholder}
          onChange={(event) => onKeywordChange(event.target.value)}
        />
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
            <option value="trust">{t.mypage.trustSort}</option>
            <option value="ad">{t.mypage.adSort}</option>
          </select>
        </label>
      </div>
    </section>
  )
}
