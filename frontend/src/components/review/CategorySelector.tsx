"use client"

import { Sparkles, Eye, Smile } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import type { CategoryKey } from "@/lib/mockData"

type Variant = "grid" | "pills"

const meta: Record<
  CategoryKey,
  { icon: typeof Sparkles; bg: string; ring: string; iconColor: string }
> = {
  derma: { icon: Sparkles, bg: "bg-pink-soft", ring: "ring-pink", iconColor: "text-pink" },
  eye: { icon: Eye, bg: "bg-lavender-soft", ring: "ring-lavender", iconColor: "text-primary" },
  dental: { icon: Smile, bg: "bg-mint-soft", ring: "ring-mint", iconColor: "text-mint" },
}

type Props = {
  selected: CategoryKey | null
  onSelect: (key: CategoryKey) => void
  variant?: Variant
}

export function CategorySelector({ selected, onSelect, variant = "grid" }: Props) {
  const { t } = useLanguage()

  const items: { key: CategoryKey; label: string; desc: string }[] = [
    { key: "derma", label: t.categories.derma, desc: t.categories.dermaDesc },
    { key: "eye", label: t.categories.eye, desc: t.categories.eyeDesc },
    { key: "dental", label: t.categories.dental, desc: t.categories.dentalDesc },
  ]

  if (variant === "pills") {
    return (
      <div className="flex gap-2">
        {items.map(({ key, label }) => {
          const m = meta[key]
          const Icon = m.icon
          const active = selected === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                active
                  ? `${m.bg} border-transparent text-foreground shadow-sm`
                  : "border-border bg-card text-graypurple hover:border-lavender"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? m.iconColor : "text-graypurple"}`} />
              {label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ key, label, desc }) => {
        const m = meta[key]
        const Icon = m.icon
        const active = selected === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`flex flex-col items-center gap-2 rounded-3xl border bg-card p-3 text-center transition-all ${
              active ? `${m.ring} ring-2 border-transparent shadow-md` : "border-border hover:border-lavender"
            }`}
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${m.bg}`}>
              <Icon className={`h-6 w-6 ${m.iconColor}`} />
            </span>
            <span className="text-sm font-bold text-foreground">{label}</span>
            <span className="text-[11px] leading-tight text-graypurple">{desc}</span>
          </button>
        )
      })}
    </div>
  )
}
