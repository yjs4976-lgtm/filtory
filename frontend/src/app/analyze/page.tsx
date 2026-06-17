"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Loader2 } from "lucide-react"
import { Header } from "@/components/common/Header"
import { BottomNav } from "@/components/common/BottomNav"
import { CategorySelector } from "@/components/review/CategorySelector"
import { useLanguage } from "@/context/LanguageContext"
import type { CategoryKey } from "@/lib/mockData"

export default function AnalyzePage() {
  const router = useRouter()
  const { t } = useLanguage()

  const [hospital, setHospital] = useState("")
  const [category, setCategory] = useState<CategoryKey | null>("derma")
  const [naver, setNaver] = useState("")
  const [google, setGoogle] = useState("")
  const [review, setReview] = useState("")
  const [mode, setMode] = useState<"ko" | "en">("ko")
  const [loading, setLoading] = useState(false)

  function handleAnalyze() {
    setLoading(true)
    setTimeout(() => {
      router.push("/result")
    }, 1800)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-8 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-lavender-soft">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
        </span>
        <p className="mt-6 text-base font-bold text-foreground">{t.analyze.loading}</p>
        <p className="mt-1.5 text-sm text-graypurple">{t.analyze.loadingSub}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={t.analyze.title} showBack />

      <main className="mx-auto max-w-md space-y-5 px-4 py-5">
        {/* Hospital name */}
        <div className="space-y-2 rounded-3xl border border-border bg-card p-5 shadow-sm">
          <label htmlFor="hospital" className="text-sm font-semibold text-foreground">
            {t.analyze.hospitalLabel}
          </label>
          <input
            id="hospital"
            value={hospital}
            onChange={(e) => setHospital(e.target.value)}
            placeholder={t.analyze.hospitalPlaceholder}
            className="w-full rounded-2xl border border-border bg-subtle px-4 py-3 text-sm text-foreground outline-none placeholder:text-graypurple focus:border-primary"
          />
        </div>

        {/* Category */}
        <div className="space-y-2.5">
          <span className="text-sm font-semibold text-foreground">{t.analyze.categoryLabel}</span>
          <CategorySelector selected={category} onSelect={setCategory} variant="pills" />
        </div>

        {/* Links */}
        <div className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="space-y-2">
            <label htmlFor="naver" className="text-sm font-semibold text-foreground">
              {t.analyze.naverLabel}
            </label>
            <input
              id="naver"
              value={naver}
              onChange={(e) => setNaver(e.target.value)}
              placeholder={t.analyze.naverPlaceholder}
              className="w-full rounded-2xl border border-border bg-subtle px-4 py-3 text-sm text-foreground outline-none placeholder:text-graypurple focus:border-primary"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="google" className="text-sm font-semibold text-foreground">
              {t.analyze.googleLabel}
            </label>
            <input
              id="google"
              value={google}
              onChange={(e) => setGoogle(e.target.value)}
              placeholder={t.analyze.googlePlaceholder}
              className="w-full rounded-2xl border border-border bg-subtle px-4 py-3 text-sm text-foreground outline-none placeholder:text-graypurple focus:border-primary"
            />
          </div>
        </div>

        {/* Review text */}
        <div className="space-y-2 rounded-3xl border border-border bg-card p-5 shadow-sm">
          <label htmlFor="review" className="text-sm font-semibold text-foreground">
            {t.analyze.reviewLabel}
          </label>
          <textarea
            id="review"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder={t.analyze.reviewPlaceholder}
            rows={5}
            className="w-full resize-none rounded-2xl border border-border bg-subtle px-4 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-graypurple focus:border-primary"
          />
        </div>

        {/* Language mode */}
        <div className="space-y-2.5 rounded-3xl border border-border bg-subtle p-5">
          <span className="text-sm font-semibold text-foreground">{t.analyze.langModeLabel}</span>
          <div className="flex gap-2">
            {(["ko", "en"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-2xl border py-2.5 text-sm font-semibold transition-all ${
                  mode === m
                    ? "border-transparent bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-graypurple"
                }`}
              >
                {m === "ko" ? "한국어" : "English"}
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleAnalyze}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-sm transition-transform active:scale-[0.99]"
        >
          <Sparkles className="h-4 w-4" />
          {t.analyze.cta}
        </button>
      </main>

      <BottomNav />
    </div>
  )
}
