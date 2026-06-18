"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Sparkles } from "lucide-react"
import { CategorySelector } from "@/components/review/CategorySelector"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import type { HospitalCategory } from "@/lib/types"
import styles from "@/styles/App.module.css"

export function HomeHero() {
  const router = useRouter()
  const { t } = useLanguage()
  const [category, setCategory] = useState<HospitalCategory>("derma")
  const [hospitalName, setHospitalName] = useState("")
  const [region, setRegion] = useState("")
  const [naverUrl, setNaverUrl] = useState("")

  function startAnalyze() {
    const params = new URLSearchParams()
    params.set("category", category)
    if (hospitalName.trim()) params.set("hospital", hospitalName.trim())
    if (region.trim()) params.set("region", region.trim())
    if (naverUrl.trim()) params.set("naver", naverUrl.trim())
    router.push(`${ROUTES.ANALYZE}?${params.toString()}`)
  }

  return (
    <section className={`${styles.heroCard} ${styles.stackMd}`}>
      <div className={styles.stackSm}>
        <span className={`${styles.iconBox} ${styles.iconLavender}`}>
          <Sparkles className={styles.iconMd} />
        </span>
        <h1 className={styles.heroTitle}>{t.home.heroTitle}</h1>
        <p className={styles.bodyText}>{t.home.heroSubtitle}</p>
      </div>

      <CategorySelector selected={category} onSelect={setCategory} variant="pills" />

      <div className={styles.heroInputGrid}>
        <input
          className={styles.input}
          value={hospitalName}
          onChange={(event) => setHospitalName(event.target.value)}
          placeholder={t.home.hospitalPlaceholder}
        />
        <input
          className={styles.input}
          value={region}
          onChange={(event) => setRegion(event.target.value)}
          placeholder={t.home.regionPlaceholder}
        />
      </div>

      <input
        className={styles.input}
        value={naverUrl}
        onChange={(event) => setNaverUrl(event.target.value)}
        placeholder={t.home.naverUrlPlaceholder}
      />

      <button type="button" className={styles.primaryButton} onClick={startAnalyze}>
        <Search className={styles.iconSm} />
        {t.home.startAnalysis}
      </button>
    </section>
  )
}
