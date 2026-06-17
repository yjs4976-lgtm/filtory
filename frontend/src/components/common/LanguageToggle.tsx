"use client"

import { useLanguage } from "@/context/LanguageContext"

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="inline-flex items-center rounded-full border border-border bg-subtle p-0.5 text-xs font-medium">
      <button
        type="button"
        onClick={() => setLanguage("ko")}
        aria-pressed={language === "ko"}
        className={`rounded-full px-3 py-1 transition-colors ${
          language === "ko" ? "bg-primary text-primary-foreground" : "text-graypurple"
        }`}
      >
        한국어
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        className={`rounded-full px-3 py-1 transition-colors ${
          language === "en" ? "bg-primary text-primary-foreground" : "text-graypurple"
        }`}
      >
        English
      </button>
    </div>
  )
}
