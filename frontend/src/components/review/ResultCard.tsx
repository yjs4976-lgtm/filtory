"use client"

import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, Info, Sparkles, RotateCcw, FileText } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ScoreCircle } from "./ScoreCircle"
import { mockAnalysisResult } from "@/lib/mockData"

function trustLevelKey(score: number) {
  if (score >= 90) return "veryHigh" as const
  if (score >= 75) return "high" as const
  if (score >= 55) return "caution" as const
  if (score >= 35) return "concern" as const
  return "veryConcern" as const
}

function levelTone(score: number) {
  if (score >= 75) return { bg: "bg-mint-soft", text: "text-foreground", dot: "bg-mint" }
  if (score >= 55) return { bg: "bg-peach-soft", text: "text-foreground", dot: "bg-peach" }
  return { bg: "bg-pink-soft", text: "text-foreground", dot: "bg-pink" }
}

function ScoreBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-bold text-foreground">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-background">
        <div className={`h-full rounded-full ${tone} transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export function ResultCard() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const r = mockAnalysisResult
  const tone = levelTone(r.total_score)
  const level = t.trustLevels[trustLevelKey(r.total_score)]

  return (
    <div className="space-y-4">
      {/* Total score card */}
      <section className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-graypurple">{r.hospital_name}</p>
        <div className="mt-4 flex justify-center">
          <ScoreCircle score={r.total_score} label={t.result.totalScore} />
        </div>
        <div className={`mx-auto mt-4 inline-flex items-center gap-2 rounded-full ${tone.bg} px-4 py-1.5`}>
          <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
          <span className={`text-sm font-bold ${tone.text}`}>{level}</span>
        </div>
        <p className="mt-3 text-xs text-graypurple">{t.result.reference}</p>
      </section>

      {/* Score breakdown */}
      <section className="space-y-4 rounded-3xl border border-border bg-subtle p-5">
        <ScoreBar label={t.result.trustScore} value={r.trust_score} tone="bg-mint" />
        <ScoreBar label={t.result.adScore} value={r.ad_score} tone="bg-pink" />
        <ScoreBar label={t.result.placeScore} value={r.place_score} tone="bg-primary" />
        <ScoreBar label={t.result.foreignerScore} value={r.foreigner_score} tone="bg-peach" />
      </section>

      {/* AI summary */}
      <section className="rounded-3xl border border-border bg-lavender-soft p-5">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">{t.result.summaryTitle}</h2>
        </div>
        <p className="text-sm leading-relaxed text-foreground">{r.summary[language]}</p>
      </section>

      {/* Concerns */}
      <section className="rounded-3xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-pink" />
          <h2 className="text-sm font-bold text-foreground">{t.result.concernsTitle}</h2>
        </div>
        <ul className="space-y-2">
          {r.concerns[language].map((c, i) => (
            <li key={i} className="flex gap-2 rounded-2xl bg-pink-soft px-3 py-2.5 text-sm text-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-pink" />
              <span className="leading-relaxed">{c}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Evidence */}
      <section className="rounded-3xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-mint" />
          <h2 className="text-sm font-bold text-foreground">{t.result.evidenceTitle}</h2>
        </div>
        <ul className="space-y-2">
          {r.evidence[language].map((e, i) => (
            <li key={i} className="flex gap-2 rounded-2xl bg-mint-soft px-3 py-2.5 text-sm text-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-mint" />
              <span className="leading-relaxed">{e}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Reference note */}
      <div className="flex items-start gap-2 rounded-2xl bg-subtle px-4 py-3 text-xs text-graypurple">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <span className="leading-relaxed">{t.result.reference}</span>
      </div>

      {/* Actions */}
      <div className="space-y-2.5 pt-1">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition-transform active:scale-[0.99]"
        >
          <FileText className="h-4 w-4" />
          {t.result.detailCta}
        </button>
        <button
          type="button"
          onClick={() => router.push("/analyze")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-bold text-foreground transition-colors hover:bg-subtle"
        >
          <RotateCcw className="h-4 w-4" />
          {t.result.retryCta}
        </button>
      </div>
    </div>
  )
}
