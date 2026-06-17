"use client"

import { useRouter } from "next/navigation"
import { User, Bookmark, Globe, LogOut, ChevronRight, Sparkles, Eye, Smile } from "lucide-react"
import { Header } from "@/components/common/Header"
import { BottomNav } from "@/components/common/BottomNav"
import { useLanguage } from "@/context/LanguageContext"
import { recentAnalyses, type CategoryKey } from "@/lib/mockData"
import type { Language } from "@/lib/translations"

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

export default function MyPage() {
  const router = useRouter()
  const { t, language, setLanguage } = useLanguage()

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={t.mypage.title} showBack />

      <main className="mx-auto max-w-md space-y-6 px-4 py-5">
        {/* Profile card */}
        <section className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-lavender-soft">
            <User className="h-8 w-8 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold text-foreground">{t.mypage.profileName}</p>
            <p className="truncate text-sm text-graypurple">{t.mypage.profileEmail}</p>
            <p className="mt-0.5 text-xs text-graypurple">{t.mypage.memberSince}</p>
          </div>
        </section>

        {/* Recent records */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">{t.mypage.recentTitle}</h2>
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
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${m.bg}`}>
                    <Icon className={`h-5 w-5 ${m.color}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{item.name[language]}</p>
                    <p className="text-xs text-graypurple">{item.date}</p>
                  </div>
                  <span className={`text-base font-extrabold ${scoreTone(item.score)}`}>{item.score}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Saved results */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">{t.mypage.savedTitle}</h2>
          <button
            type="button"
            onClick={() => router.push("/result")}
            className="flex w-full items-center gap-3 rounded-3xl border border-border bg-peach-soft p-4 text-left transition-transform active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-card">
              <Bookmark className="h-5 w-5 text-peach" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {recentAnalyses[0].name[language]}
              </p>
              <p className="text-xs text-graypurple">{t.home.trustReliable}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-graypurple" />
          </button>
        </section>

        {/* Language settings */}
        <section className="space-y-3 rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">{t.mypage.languageTitle}</h2>
          </div>
          <p className="text-xs text-graypurple">{t.mypage.languageDesc}</p>
          <div className="flex gap-2 pt-1">
            {(["ko", "en"] as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`flex-1 rounded-2xl border py-2.5 text-sm font-semibold transition-all ${
                  language === lang
                    ? "border-transparent bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-subtle text-graypurple"
                }`}
              >
                {lang === "ko" ? "한국어" : "English"}
              </button>
            ))}
          </div>
        </section>

        {/* Logout */}
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-bold text-pink transition-colors hover:bg-pink-soft"
        >
          <LogOut className="h-4 w-4" />
          {t.mypage.logout}
        </button>
      </main>

      <BottomNav />
    </div>
  )
}
