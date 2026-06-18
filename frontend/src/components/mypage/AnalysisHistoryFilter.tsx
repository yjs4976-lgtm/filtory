"use client"

import type { HospitalCategory } from "@/lib/types"
import type { AnalysisHistorySort, TrustFilter } from "@/services/analysisHistoryService"
import { categoryLabels } from "@/services/memberMockData"
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
  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <label className={styles.label} htmlFor="history-keyword">
        병원명 검색
        <input
          id="history-keyword"
          className={styles.input}
          value={keyword}
          placeholder="병원명을 검색해보세요"
          onChange={(event) => onKeywordChange(event.target.value)}
        />
      </label>
      <div className={styles.filterGrid}>
        <label className={styles.label}>
          분야
          <select className={styles.input} value={category} onChange={(event) => onCategoryChange(event.target.value as "all" | HospitalCategory)}>
            <option value="all">전체</option>
            <option value="derma">{categoryLabels.derma}</option>
            <option value="eye">{categoryLabels.eye}</option>
            <option value="dental">{categoryLabels.dental}</option>
          </select>
        </label>
        <label className={styles.label}>
          신뢰도 등급
          <select className={styles.input} value={trust} onChange={(event) => onTrustChange(event.target.value as TrustFilter)}>
            <option value="all">전체</option>
            <option value="high">높음</option>
            <option value="medium">보통</option>
            <option value="caution">주의</option>
          </select>
        </label>
        <label className={styles.label}>
          정렬
          <select className={styles.input} value={sort} onChange={(event) => onSortChange(event.target.value as AnalysisHistorySort)}>
            <option value="latest">최신순</option>
            <option value="trust">신뢰도 높은 순</option>
            <option value="ad">광고 의심 높은 순</option>
          </select>
        </label>
      </div>
    </section>
  )
}
