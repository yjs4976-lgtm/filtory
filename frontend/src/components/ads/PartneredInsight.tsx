"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import type { SponsoredInsight } from "@/types/sponsoredInsight"
import { AdTransparencySheet } from "./AdTransparencySheet"
import styles from "@/styles/App.module.css"

type Props = { insight: SponsoredInsight | null; showSponsoredContent: boolean; showResultEnd?: boolean }

export function PartneredInsight({ insight, showSponsoredContent, showResultEnd = false }: Props) {
  const { language } = useLanguage()
  const [sheetOpen, setSheetOpen] = useState(false)
  if (!showSponsoredContent || !insight?.isActive) return null
  const ko = language === "ko"

  return <section className={styles.partneredInsightRegion} aria-label={ko ? "스폰서 정보 콘텐츠" : "Sponsored informational content"}>
    {showResultEnd && <div className={styles.analysisResultEnd}><span>{ko ? "분석 결과가 모두 끝났습니다" : "You have reached the end of the analysis"}</span></div>}
    <article className={styles.partneredInsight}>
      <header><span>{insight.eyebrow}</span><em>{ko ? "광고" : "Ad"}</em></header>
      <h2>{insight.title}</h2>
      <p>{insight.description}</p>
      {insight.href && <Link href={insight.href} className={styles.partneredInsightLink}><span>{insight.readingTime ?? (ko ? "자세히 읽기" : "Read more")}</span><ArrowUpRight aria-hidden="true" /><span className={styles.srOnly}>{insight.title}</span></Link>}
      <footer><span>{ko ? "Presented by" : "Presented by"} <strong>{insight.sponsorName}</strong></span><button type="button" onClick={() => setSheetOpen(true)}>{ko ? "광고 정보" : "Ad information"}</button></footer>
    </article>
    <AdTransparencySheet open={sheetOpen} insight={insight} onClose={() => setSheetOpen(false)} />
  </section>
}
