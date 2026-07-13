"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Bookmark, ChevronRight, Clock3, Hospital } from "lucide-react"
import { FavoriteHospitalButton } from "@/components/favorites/FavoriteHospitalButton"
import { useLanguage } from "@/context/LanguageContext"
import { hospitalCategoryLabel } from "@/lib/hospitalCategories"
import { ROUTES } from "@/lib/routes"
import type { HospitalItem, RecentViewedHospital, SavedHospital } from "@/lib/types"
import { favoriteHospitalIdentity } from "@/services/savedHospitalService"
import styles from "@/styles/App.module.css"

type Props = {
  recent: RecentViewedHospital[]
  favorites: SavedHospital[]
  recentTotal: number
  favoriteTotal: number
  loading: boolean
  error: boolean
  onRetry: () => void
  onFavoritesChange: (favorites: SavedHospital[], total: number, hospitalId: number, isFavorite: boolean) => void
}

const text = {
  ko: { title: "내 병원", desc: "최근 본 병원과 관심 병원을 한눈에 확인하세요.", recent: "최근 본", favorites: "관심 병원", all: "전체 보기", recentEmpty: "아직 최근 본 병원이 없어요", recentEmptyDesc: "병원 정보나 분석 결과를 확인하면 최근 본 병원이 여기에 표시돼요.", favoriteEmpty: "아직 관심 병원이 없어요", favoriteEmptyDesc: "병원 검색이나 분석 결과에서 책갈피를 누르면 이곳에서 다시 확인할 수 있어요.", browse: "병원 찾아보기", viewed: "최근 확인", analyzed: "최근 분석", notAnalyzed: "아직 분석하지 않은 병원이에요.", trust: "신뢰도", error: "내 병원 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.", retry: "다시 불러오기", loading: "내 병원 정보를 불러오는 중", image: "병원 기본 이미지" },
  en: { title: "My Hospitals", desc: "View your recently viewed and favorite hospitals in one place.", recent: "Recently Viewed", favorites: "Favorites", all: "View All", recentEmpty: "No recently viewed hospitals", recentEmptyDesc: "Hospitals and analysis results you view will appear here.", favoriteEmpty: "No favorite hospitals yet", favoriteEmptyDesc: "Tap the bookmark on a hospital or analysis result to save it for later.", browse: "Browse Hospitals", viewed: "Recently Viewed", analyzed: "Recent Analysis", notAnalyzed: "This hospital has not been analyzed yet.", trust: "Trust Level", error: "We couldn't load your hospital information. Please try again later.", retry: "Retry", loading: "Loading your hospital information", image: "Hospital placeholder image" },
}

function toHospitalItem(hospital: RecentViewedHospital | SavedHospital): HospitalItem {
  return { id: String(hospital.id), internalHospitalId: hospital.id, provider: hospital.sourceProvider || "filtory", externalPlaceId: hospital.externalPlaceId, name: hospital.hospitalName, category: hospital.category, region: "seoul", address: hospital.address, roadAddress: hospital.roadAddress, phone: hospital.phone, mapUrl: hospital.mapUrl }
}

export function MyHospitals(props: Props) {
  const { language } = useLanguage() as { language: "ko" | "en" }
  const c = text[language]
  const params = useSearchParams()
  const router = useRouter()
  const [tab, setTab] = useState<"recent" | "favorites">(params.get("hospitalTab") === "favorites" ? "favorites" : "recent")
  const favoritesRef = useRef(props.favorites)
  const favoriteTotalRef = useRef(props.favoriteTotal)
  const removedPositions = useRef(new Map<number, number>())
  useEffect(() => {
    favoritesRef.current = props.favorites
    favoriteTotalRef.current = props.favoriteTotal
  }, [props.favoriteTotal, props.favorites])
  const favoriteKeys = new Set(props.favorites.map((item) => favoriteHospitalIdentity(toHospitalItem(item))))
  const items = tab === "recent" ? props.recent : props.favorites
  const total = tab === "recent" ? props.recentTotal : props.favoriteTotal
  const viewAll = tab === "recent" ? ROUTES.MYPAGE_RECENT : ROUTES.MYPAGE_FAVORITE_HOSPITALS

  const selectTab = (value: "recent" | "favorites") => {
    setTab(value)
    const next = new URLSearchParams(params.toString())
    next.set("hospitalTab", value)
    router.replace(`/mypage?${next}`, { scroll: false })
  }

  const updateFavoritePreview = (hospital: RecentViewedHospital | SavedHospital, favorite: boolean, savedId: number | undefined, previousFavorite: boolean) => {
    const currentFavorites = favoritesRef.current
    const hospitalKey = favoriteHospitalIdentity(toHospitalItem(hospital))
    const existing = currentFavorites.find((item) => favoriteHospitalIdentity(toHospitalItem(item)) === hospitalKey)
    const previewItem: SavedHospital = existing ?? {
      id: savedId ?? hospital.id,
      hospitalName: hospital.hospitalName,
      category: hospital.category,
      address: hospital.address,
      trustScore: hospital.trustScore ?? 0,
      trustLevel: hospital.trustLevel ?? "",
      adSuspicionScore: 0,
      adSuspicionLevel: "",
      infoCompletenessScore: 0,
      globalAccessRating: 0,
      savedAt: new Date().toISOString(),
      lastAnalyzedAt: hospital.lastAnalyzedAt,
      roadAddress: hospital.roadAddress,
      phone: hospital.phone,
      mapUrl: hospital.mapUrl,
      externalPlaceId: hospital.externalPlaceId,
      sourceProvider: hospital.sourceProvider,
      isAnalyzed: Boolean(hospital.analysisResultId),
      analysisResultId: hospital.analysisResultId,
    }
    let nextFavorites: SavedHospital[]
    if (favorite) {
      const withoutHospital = currentFavorites.filter((item) => item.id !== previewItem.id)
      const index = Math.min(removedPositions.current.get(hospital.id) ?? 0, withoutHospital.length)
      nextFavorites = [...withoutHospital]
      nextFavorites.splice(index, 0, previewItem)
      nextFavorites = nextFavorites.slice(0, 3)
      removedPositions.current.delete(hospital.id)
    } else {
      const index = currentFavorites.findIndex((item) => item.id === hospital.id)
      if (index >= 0) removedPositions.current.set(hospital.id, index)
      nextFavorites = currentFavorites.filter((item) => item.id !== hospital.id)
    }
    const delta = favorite === previousFavorite ? 0 : favorite ? 1 : -1
    props.onFavoritesChange(nextFavorites, Math.max(0, favoriteTotalRef.current + delta), hospital.id, favorite)
  }

  return (
    <section className={styles.myHospitalsCard}>
      <header className={styles.myHospitalsHeader}>
        <div><h2>{c.title}</h2><p>{c.desc}</p></div>
        <Link href={viewAll}>{c.all}<ChevronRight aria-hidden="true" /></Link>
      </header>
      <div className={styles.myHospitalTabs} role="tablist" aria-label={c.title}>
        <button role="tab" aria-selected={tab === "recent"} onClick={() => selectTab("recent")}><span>{c.recent}</span><b>{props.recentTotal}</b></button>
        <button role="tab" aria-selected={tab === "favorites"} onClick={() => selectTab("favorites")}><Bookmark aria-hidden="true" fill="currentColor"/><span>{c.favorites}</span><b>{props.favoriteTotal}</b></button>
      </div>
      <div role="tabpanel" aria-live="polite">
        {props.loading ? (
          <div className={styles.myHospitalSkeleton} aria-label={c.loading}>{[1, 2, 3].map((number) => <i key={number}/>)}</div>
        ) : props.error ? (
          <div className={styles.myHospitalEmpty}><p>{c.error}</p><button onClick={props.onRetry}>{c.retry}</button></div>
        ) : total === 0 ? (
          <div className={styles.myHospitalEmpty} data-favorite={tab === "favorites"}>
            {tab === "recent" ? <Clock3 aria-hidden="true"/> : <Bookmark aria-hidden="true"/>}
            <h3>{tab === "recent" ? c.recentEmpty : c.favoriteEmpty}</h3>
            <p>{tab === "recent" ? c.recentEmptyDesc : c.favoriteEmptyDesc}</p>
            <Link href={ROUTES.ANALYZE}>{c.browse}</Link>
          </div>
        ) : (
          <div className={styles.myHospitalList}>
            {items.slice(0, 3).map((hospital) => {
              const item = toHospitalItem(hospital)
              const hospitalKey = favoriteHospitalIdentity(item)
              const favoriteItem = props.favorites.find((favoriteHospital) => favoriteHospitalIdentity(toHospitalItem(favoriteHospital)) === hospitalKey)
              const favorite = tab === "favorites" || favoriteKeys.has(hospitalKey) || Boolean("isFavorite" in hospital && hospital.isFavorite)
              const href = hospital.analysisResultId ? `${ROUTES.RESULT}?resultId=${hospital.analysisResultId}` : `${ROUTES.HOSPITAL_DETAIL}/${hospital.id}`
              return (
                <article key={hospital.id}>
                  <div className={styles.myHospitalImage} role="img" aria-label={`${hospital.hospitalName} ${c.image}`}><Hospital aria-hidden="true"/></div>
                  <Link href={href} className={styles.myHospitalBody}>
                    <div><strong>{hospital.hospitalName}</strong><span className={`${styles.myHospitalCategory} ${styles[`myHospitalCategory_${hospital.category}`]}`}>{hospitalCategoryLabel(hospital.category, language)}</span></div>
                    <p>{hospital.address}</p>
                    <small>{tab === "recent" ? `${c.viewed} · ${formatDate((hospital as RecentViewedHospital).viewedAt, language)}` : hospital.lastAnalyzedAt ? `${c.analyzed} · ${c.trust} ${hospital.trustLevel || hospital.trustScore} · ${formatDate(hospital.lastAnalyzedAt, language)}` : c.notAnalyzed}</small>
                  </Link>
                  <FavoriteHospitalButton hospital={item} initialFavorite={favorite} favoriteHospitalId={favoriteItem?.id} iconOnly className={styles.myHospitalFavorite} onChange={(nextFavorite, context) => updateFavoritePreview(hospital, nextFavorite, context.savedHospitalId, context.previousFavorite)}/>
                  <Link href={href} className={styles.myHospitalChevron} aria-label={hospital.hospitalName}><ChevronRight aria-hidden="true"/></Link>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function formatDate(value: string | undefined, language: "ko" | "en") {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "short", day: "numeric" }).format(date)
}
