"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Plus, Sparkles, Eye, Smile } from "lucide-react"
import { Header } from "@/components/common/Header"
import { BottomNav } from "@/components/common/BottomNav"
import { CategorySelector } from "@/components/review/CategorySelector"
import { useLanguage } from "@/context/LanguageContext"
import { recentAnalyses, type CategoryKey } from "@/lib/mockData"

const catMeta: Record<CategoryKey, { icon: typeof Sparkles; bg: string; color: string }> = {
  derma: { icon: Sparkles, bg: "bg-pink-soft", color: "text-pink" },
  eye: { icon: Eye, bg: "bg-lavender-soft", color: "text-primary" },
  dental: { icon: Smile, bg: "bg-mint-soft", color: "text-mint" },
}

function scoreTone(score: number) {
  if (score >= 75) return "text-mint"
  if (score >= 55) return "text-peach"
  return "text-pink"
}

export default function HomePage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const [category, setCategory] = useState<CategoryKey | null>(null)
  const [query, setQuery] = useState("")

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header showBrand showBell />

      <main className="mx-auto max-w-md space-y-6 px-4 py-5">
        {/* Greeting hero */}
        <section className="rounded-3xl border border-border bg-lavender-soft p-5">
          <h1 className="text-xl font-bold text-foreground">{t.home.greeting}</h1>
          <p className="mt-1 text-sm leading-relaxed text-graypurple">{t.home.welcome}</p>
        </section>

        {/* Category selection */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">{t.home.selectCategory}</h2>
          <CategorySelector selected={category} onSelect={setCategory} />
        </section>

        {/* Input card */}
        <section className="space-y-3 rounded-3xl border border-border bg-card p-5 shadow-sm">
          <label className="text-sm font-semibold text-foreground" htmlFor="home-input">
            {t.home.inputLabel}
          </label>
          <input
            id="home-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.home.inputPlaceholder}
            className="w-full rounded-2xl border border-border bg-subtle px-4 py-3 text-sm text-foreground outline-none placeholder:text-graypurple focus:border-primary"
          />
          <button
            type="button"
            onClick={() => router.push("/analyze")}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-transform active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" />
            {t.home.cta}
          </button>
        </section>

        {/* Recent analyses */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">{t.home.recentTitle}</h2>
            <button
              type="button"
              className="flex items-center gap-0.5 text-xs font-medium text-graypurple"
            >
              {t.home.seeAll}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentAnalyses.map((item) => {
              const m = catMeta[item.category]
              const Icon = m.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push("/result")}
                  className="flex w-full items-center gap-3 rounded-3xl border border-border bg-subtle p-3.5 text-left transition-colors hover:border-lavender"
                >
                  <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${m.bg}`}>
                    <Icon className={`h-5 w-5 ${m.color}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{item.name[language]}</p>
                    <p className="text-xs text-graypurple">{item.date}</p>
                  </div>
                  <span className={`text-lg font-extrabold ${scoreTone(item.score)}`}>{item.score}</span>
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
