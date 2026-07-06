"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { translations } from "@/lib/translations"

const LanguageContext = createContext(undefined)
const STORAGE_KEY = "filtory-language"

function getStoredLanguage() {
  if (typeof window === "undefined") return "ko"
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === "ko" || stored === "en" ? stored : "ko"
}

export function LanguageProvider({ children }) {
  // 첫 클라이언트 렌더는 SSR 결과와 맞추고, 다음 프레임에서 저장된 언어 설정을 복원한다.
  const [language, setLanguageState] = useState("ko")

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setLanguageState(getStoredLanguage()))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const setLanguage = (lang) => {
    setLanguageState(lang)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, lang)
    }
  }

  const value = {
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
