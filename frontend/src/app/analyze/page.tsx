"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Sparkles } from "lucide-react"
import { BottomNav } from "@/components/common/BottomNav"
import { Header } from "@/components/common/Header"
import { CategorySelector } from "@/components/review/CategorySelector"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export default function AnalyzePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [hospital, setHospital] = useState("")
  const [category, setCategory] = useState("derma")
  const [naver, setNaver] = useState("")
  const [google, setGoogle] = useState("")
  const [review, setReview] = useState("")
  const [mode, setMode] = useState("ko")
  const [loading, setLoading] = useState(false)

  function handleAnalyze() {
    setLoading(true)
    setTimeout(() => {
      router.push("/result")
    }, 1800)
  }

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <span className={styles.loadingIcon}>
          <Loader2 className={`${styles.iconLg} ${styles.spin}`} />
        </span>
        <p className={styles.loadingTitle}>{t.analyze.loading}</p>
        <p className={styles.loadingSub}>{t.analyze.loadingSub}</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Header title={t.analyze.title} showBack />

      <main className={`${styles.main} ${styles.stackMd}`}>
        <div className={`${styles.card} ${styles.stackSm}`}>
          <label htmlFor="hospital" className={styles.label}>
            {t.analyze.hospitalLabel}
          </label>
          <input
            id="hospital"
            value={hospital}
            onChange={(event) => setHospital(event.target.value)}
            placeholder={t.analyze.hospitalPlaceholder}
            className={styles.input}
          />
        </div>

        <div className={styles.stackSm}>
          <span className={styles.label}>{t.analyze.categoryLabel}</span>
          <CategorySelector selected={category} onSelect={setCategory} variant="pills" />
        </div>

        <div className={`${styles.card} ${styles.stackMd}`}>
          <div className={styles.stackSm}>
            <label htmlFor="naver" className={styles.label}>
              {t.analyze.naverLabel}
            </label>
            <input
              id="naver"
              value={naver}
              onChange={(event) => setNaver(event.target.value)}
              placeholder={t.analyze.naverPlaceholder}
              className={styles.input}
            />
          </div>
          <div className={styles.stackSm}>
            <label htmlFor="google" className={styles.label}>
              {t.analyze.googleLabel}
            </label>
            <input
              id="google"
              value={google}
              onChange={(event) => setGoogle(event.target.value)}
              placeholder={t.analyze.googlePlaceholder}
              className={styles.input}
            />
          </div>
        </div>

        <div className={`${styles.card} ${styles.stackSm}`}>
          <label htmlFor="review" className={styles.label}>
            {t.analyze.reviewLabel}
          </label>
          <textarea
            id="review"
            value={review}
            onChange={(event) => setReview(event.target.value)}
            placeholder={t.analyze.reviewPlaceholder}
            className={styles.textarea}
          />
        </div>

        <div className={`${styles.softCard} ${styles.stackSm}`}>
          <span className={styles.label}>{t.analyze.langModeLabel}</span>
          <div className={styles.segmented}>
            {["ko", "en"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={[styles.segmentButton, mode === item ? styles.segmentButtonActive : ""].join(" ")}
              >
                {item === "ko" ? "한국어" : "English"}
              </button>
            ))}
          </div>
        </div>

        <button type="button" onClick={handleAnalyze} className={styles.primaryButton}>
          <Sparkles className={styles.iconSm} />
          {t.analyze.cta}
        </button>
      </main>

      <BottomNav />
    </div>
  )
}
