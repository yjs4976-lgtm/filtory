"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Bookmark, Search } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { FavoriteHospitalButton } from "@/components/favorites/FavoriteHospitalButton"
import { AppShell } from "@/components/common/AppShell"
import { useLanguage } from "@/context/LanguageContext"
import { HOSPITAL_CATEGORIES, hospitalCategoryLabel } from "@/lib/hospitalCategories"
import { ROUTES } from "@/lib/routes"
import type { HospitalItem, SavedHospital } from "@/lib/types"
import { savedHospitalService } from "@/services/savedHospitalService"
import styles from "@/styles/App.module.css"

const copy = {
  ko: { title: "관심 병원", description: "관심 있는 병원을 저장하고 필요할 때 다시 확인하거나 분석해보세요.", count: (count: number) => `관심 병원 ${count}곳`, category: "진료 분야", status: "분석 상태", all: "전체", before: "분석 전", done: "분석 완료", search: "관심 병원 검색", latest: "최근 저장순", oldest: "오래된 저장순", name: "병원명순", notAnalyzed: "아직 분석하지 않은 병원이에요. 리뷰를 가져와 확인해보세요.", recent: "최근 분석", analyze: "분석하기", info: "병원 정보", result: "결과 보기", again: "다시 분석하기", empty: "아직 관심 병원이 없어요", emptyDesc: "병원 검색이나 분석 결과에서 책갈피를 누르면 이곳에서 다시 확인할 수 있어요.", browse: "병원 찾아보기", noSearch: "검색한 병원을 찾지 못했어요. 병원명을 다시 확인해주세요.", noFilter: "선택한 조건에 맞는 관심 병원이 없어요. 진료 분야나 분석 상태 필터를 변경해보세요.", loadError: "관심 병원을 불러오지 못했어요. 잠시 후 다시 시도해주세요.", retry: "다시 불러오기", loading: "관심 병원을 불러오는 중이에요.", prev: "이전", next: "다음" },
  en: { title: "Favorite Hospitals", description: "Save hospitals you are interested in and review or analyze them later.", count: (count: number) => `${count} Favorite Hospitals`, category: "Medical specialty", status: "Analysis status", all: "All", before: "Not Analyzed", done: "Analyzed", search: "Search favorite hospitals", latest: "Recently Saved", oldest: "Oldest Saved", name: "Name", notAnalyzed: "This hospital has not been analyzed yet. Add reviews to analyze this hospital.", recent: "Recent Analysis", analyze: "Analyze", info: "Hospital Info", result: "View Result", again: "Analyze Again", empty: "No favorite hospitals yet", emptyDesc: "Tap the bookmark on a hospital or analysis result to save it for later.", browse: "Browse Hospitals", noSearch: "No hospitals found for your search. Check the hospital name and try again.", noFilter: "No favorite hospitals match your filters. Try changing the category or analysis status.", loadError: "We couldn't load your favorite hospitals. Please try again later.", retry: "Retry", loading: "Loading favorite hospitals.", prev: "Previous", next: "Next" },
}

function toHospitalItem(hospital: SavedHospital): HospitalItem {
  return { id: String(hospital.id), internalHospitalId: hospital.id, provider: hospital.sourceProvider || "filtory", externalPlaceId: hospital.externalPlaceId, name: hospital.hospitalName, category: hospital.category, region: "seoul", address: hospital.address, roadAddress: hospital.roadAddress, phone: hospital.phone, mapUrl: hospital.mapUrl }
}

export default function FavoriteHospitalsPage() {
  const { language } = useLanguage() as { language: "ko" | "en" }
  const c = copy[language]
  const [items, setItems] = useState<SavedHospital[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState<"" | "analyzed" | "not_analyzed">("")
  const [sort, setSort] = useState<"latest" | "oldest" | "name">("latest")
  const [keyword, setKeyword] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const removedPositions = useRef(new Map<number, number>())

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await savedHospitalService.getFavoriteHospitals({ page, size: 6, category, status: status || undefined, sort, keyword })
      setItems(data.items)
      setTotal(data.total)
      setTotalPages(data.totalPages)
      if (page > data.totalPages) setPage(data.totalPages)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [category, keyword, page, sort, status])

  useEffect(() => {
    const timer = window.setTimeout(load, 250)
    return () => window.clearTimeout(timer)
  }, [load])

  const resetPage = (update: () => void) => { setPage(1); update() }
  const handleFavoriteChange = (hospital: SavedHospital, favorite: boolean, savedId?: number) => {
    if (favorite) {
      setItems((current) => {
        if (current.some((item) => item.id === hospital.id)) return current
        const next = [...current]
        const index = Math.min(removedPositions.current.get(hospital.id) ?? 0, next.length)
        next.splice(index, 0, { ...hospital, id: savedId ?? hospital.id })
        removedPositions.current.delete(hospital.id)
        return next
      })
      setTotal((current) => {
        const next = current + 1
        setTotalPages(Math.max(1, Math.ceil(next / 6)))
        return next
      })
      return
    }
    setItems((current) => {
      const index = current.findIndex((item) => item.id === hospital.id)
      if (index >= 0) removedPositions.current.set(hospital.id, index)
      return current.filter((item) => item.id !== hospital.id)
    })
    setTotal((current) => {
      const next = Math.max(0, current - 1)
      setTotalPages(Math.max(1, Math.ceil(next / 6)))
      return next
    })
    if (items.length === 1 && page > 1) setPage((current) => Math.max(1, current - 1))
  }

  return (
    <ProtectedRoute>
      <AppShell title={c.title} showBack>
        <div className={styles.favoritePage}>
          <header className={styles.favoriteHeader}><h1>{c.title}</h1><p>{c.description}</p><strong>{c.count(total)}</strong></header>
          <section className={styles.favoriteFilters} aria-label={c.category}>
            <span>{c.category}</span>
            <div className={styles.favoriteChips}>
              <button className={!category ? styles.favoriteChipActive : styles.favoriteChip} onClick={() => resetPage(() => setCategory(""))}>{c.all}</button>
              {HOSPITAL_CATEGORIES.map((item) => <button key={item.value} className={category === item.value ? styles.favoriteChipActive : styles.favoriteChip} onClick={() => resetPage(() => setCategory(item.value))}>{language === "ko" ? item.labelKo : item.labelEn}</button>)}
            </div>
            <span>{c.status}</span>
            <div className={styles.favoriteChips} aria-label={c.status}>
              {[["", c.all], ["not_analyzed", c.before], ["analyzed", c.done]].map(([value, label]) => <button key={value} className={status === value ? styles.favoriteChipActive : styles.favoriteChip} onClick={() => resetPage(() => setStatus(value as typeof status))}>{label}</button>)}
            </div>
            <div className={styles.favoriteTools}>
              <label><Search size={18}/><input value={keyword} onChange={(event) => resetPage(() => setKeyword(event.target.value))} placeholder={c.search} aria-label={c.search}/></label>
              <select value={sort} onChange={(event) => resetPage(() => setSort(event.target.value as typeof sort))}><option value="latest">{c.latest}</option><option value="oldest">{c.oldest}</option><option value="name">{c.name}</option></select>
            </div>
          </section>

          {loading ? (
            <div className={styles.favoriteSkeleton} aria-label={c.loading}>{[1, 2, 3].map((number) => <i key={number}/>)}</div>
          ) : error ? (
            <div className={styles.favoriteEmpty}><p>{c.loadError}</p><button onClick={load}>{c.retry}</button></div>
          ) : !items.length ? (
            <div className={styles.favoriteEmpty}>
              <Bookmark/>
              <h2>{total === 0 && !keyword && !category && !status ? c.empty : keyword ? c.noSearch : c.noFilter}</h2>
              {total === 0 && !keyword && !category && !status && <><p>{c.emptyDesc}</p><Link href={ROUTES.ANALYZE}>{c.browse}</Link></>}
            </div>
          ) : (
            <div className={styles.favoriteGrid}>
              {items.map((hospital) => (
                <article className={styles.favoriteCard} key={hospital.id}>
                  <FavoriteHospitalButton hospital={toHospitalItem(hospital)} initialFavorite favoriteHospitalId={hospital.id} iconOnly className={styles.favoriteBookmark} onChange={(favorite, context) => handleFavoriteChange(hospital, favorite, context.savedHospitalId)}/>
                  <h2>{hospital.hospitalName}</h2>
                  <p>{hospitalCategoryLabel(hospital.category, language)} · {hospital.address}</p>
                  {hospital.isAnalyzed ? <div><strong>{c.recent}</strong><p>{hospital.trustLevel || hospital.trustScore} · {hospital.lastAnalyzedAt ? new Intl.DateTimeFormat(language).format(new Date(hospital.lastAnalyzedAt)) : ""}</p></div> : <p>{c.notAnalyzed}</p>}
                  <div className={styles.favoriteActions}>
                    {hospital.isAnalyzed && hospital.analysisResultId ? <Link href={`${ROUTES.RESULT}?resultId=${hospital.analysisResultId}`}>{c.result}</Link> : <Link href={`${ROUTES.ANALYZE}?hospitalId=${hospital.id}`}>{c.analyze}</Link>}
                    <Link href={`${ROUTES.HOSPITAL_DETAIL}/${hospital.id}`}>{hospital.isAnalyzed ? c.again : c.info}</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
          {totalPages > 1 && <nav className={styles.favoritePager}><button disabled={page <= 1} onClick={() => setPage(page - 1)}>{c.prev}</button><span>{page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{c.next}</button></nav>}
        </div>
      </AppShell>
    </ProtectedRoute>
  )
}
