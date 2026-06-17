"use client"

import { Header } from "@/components/common/Header"
import { BottomNav } from "@/components/common/BottomNav"
import { ResultCard } from "@/components/review/ResultCard"
import { useLanguage } from "@/context/LanguageContext"

export default function ResultPage() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={t.result.title} showBack />
      <main className="mx-auto max-w-md px-4 py-5">
        <ResultCard />
      </main>
      <BottomNav />
    </div>
  )
}
