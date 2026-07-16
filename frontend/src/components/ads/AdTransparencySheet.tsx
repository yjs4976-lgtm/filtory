"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import type { SponsoredInsight } from "@/types/sponsoredInsight"
import styles from "@/styles/App.module.css"

type Props = { open: boolean; insight: SponsoredInsight; onClose: () => void }

export function AdTransparencySheet({ open, insight, onClose }: Props) {
  const { language } = useLanguage()
  const sheetRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(open)
  const ko = language === "ko"

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(open), open ? 0 : 190)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement as HTMLElement | null
    document.body.style.overflow = "hidden"
    closeRef.current?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return }
      if (event.key !== "Tab" || !sheetRef.current) return
      const focusable = [...sheetRef.current.querySelectorAll<HTMLElement>("button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])")]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener("keydown", keydown)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", keydown); previousFocus?.focus() }
  }, [onClose, open])

  if (!mounted) return null
  const no = ko ? "사용하지 않음" : "Not used"
  const rows = [
    [ko ? "파트너" : "Partner", insight.sponsorName],
    [ko ? "콘텐츠 유형" : "Content type", ko ? "유료 정보 콘텐츠" : "Paid informational content"],
    [ko ? "개인정보 이용" : "Personal data", insight.personalDataUsed ? (ko ? "사용함" : "Used") : no],
    [ko ? "개인 맞춤 광고" : "Personalized ads", insight.personalizedAd ? (ko ? "사용함" : "Used") : no],
    [ko ? "분석 결과 영향" : "Effect on analysis", insight.affectsAnalysis ? (ko ? "있음" : "Yes") : (ko ? "없음" : "None")],
  ]

  return <div className={`${styles.adSheetLayer} ${open ? styles.adSheetLayerOpen : styles.adSheetLayerClosing}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <aside ref={sheetRef} className={`${styles.adSheet} ${open ? styles.adSheetOpen : styles.adSheetClosing}`} role="dialog" aria-modal="true" aria-hidden={!open} aria-labelledby="ad-transparency-title">
      <div className={styles.adSheetHandle} aria-hidden="true" />
      <header><div><span>{ko ? "광고 안내" : "Ad disclosure"}</span><h2 id="ad-transparency-title">{ko ? "광고 투명성 정보" : "Advertising transparency"}</h2></div><button ref={closeRef} type="button" onClick={onClose} aria-label={ko ? "광고 정보 닫기" : "Close advertising information"}><X /></button></header>
      <dl>{rows.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
      <p className={styles.adSheetNotice}>{ko ? "이 파트너십은 Filtory의 병원 평가, 신뢰도 점수, 분석 결과 및 병원 노출 순서에 영향을 주지 않습니다." : "This partnership does not affect Filtory hospital evaluations, trust scores, analysis results, or hospital display order."}</p>
    </aside>
  </div>
}
