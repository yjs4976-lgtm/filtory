"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Eye, Plus, Smile, Sparkles } from "lucide-react"
import { BottomNav } from "@/components/common/BottomNav"
import { Header } from "@/components/common/Header"
import { CategorySelector } from "@/components/review/CategorySelector"
import { useLanguage } from "@/context/LanguageContext"
import { recentAnalyses } from "@/lib/mockData"
import styles from "@/styles/App.module.css"

const categoryMeta = {
  derma: { icon: Sparkles, box: styles.iconPink },
  eye: { icon: Eye, box: styles.iconLavender },
  dental: { icon: Smile, box: styles.iconMint },
}

function scoreClass(score) {
  if (score >= 75) return styles.scoreGood
  if (score >= 55) return styles.scoreWarn
  return styles.scoreBad
}

export default function HomePage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const [category, setCategory] = useState(null)
  const [query, setQuery] = useState("")

  return (
    <div className={styles.page}>
      <Header showBrand showBell />

      <main className={`${styles.main} ${styles.stack}`}>
        <section className={styles.accentCard}>
          <h1 className={styles.titleLg}>{t.home.greeting}</h1>
          <p className={styles.bodyText}>{t.home.welcome}</p>
        </section>

        <section className={styles.stackSm}>
          <h2 className={styles.titleSm}>{t.home.selectCategory}</h2>
          <CategorySelector selected={category} onSelect={setCategory} />
        </section>

        <section className={`${styles.card} ${styles.stackSm}`}>
          <label className={styles.label} htmlFor="home-input">
            {t.home.inputLabel}
          </label>
          <input
            id="home-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.home.inputPlaceholder}
            className={styles.input}
          />
          <button type="button" onClick={() => router.push("/analyze")} className={styles.primaryButton}>
            <Plus className={styles.iconSm} />
            {t.home.cta}
          </button>
        </section>

        <section className={styles.stackSm}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.titleSm}>{t.home.recentTitle}</h2>
            <button type="button" className={styles.seeAllButton}>
              {t.home.seeAll}
              <ChevronRight className={styles.iconXs} />
            </button>
          </div>

          <div className={styles.recordList}>
            {recentAnalyses.map((item) => {
              const meta = categoryMeta[item.category]
              const Icon = meta.icon
              return (
                <button key={item.id} type="button" onClick={() => router.push("/result")} className={styles.recordButton}>
                  <span className={`${styles.iconBox} ${meta.box}`}>
                    <Icon className={styles.iconMd} />
                  </span>
                  <div className={styles.recordBody}>
                    <p className={styles.recordName}>{item.name[language]}</p>
                    <p className={styles.recordDate}>{item.date}</p>
                  </div>
                  <span className={`${styles.score} ${scoreClass(item.score)}`}>{item.score}</span>
                </button>
              )
            })}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
