"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { translations, type Language, type TranslationSet } from "@/lib/translations"

type LanguageContextValue = {
  language: Language
  setLanguage: (lang: Language) => void
  t: TranslationSet
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

const STORAGE_KEY = "filtory-language"

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem(STORAGE_KEY) as Language | null) : null
    return stored === "ko" || stored === "en" ? stored : "ko"
  })

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, lang)
    }
  }

  const value: LanguageContextValue = {
    language,
    setLanguage,
    t: translations[language],
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return ctx
}
