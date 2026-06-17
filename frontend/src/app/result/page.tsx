"use client"

import { BottomNav } from "@/components/common/BottomNav"
import { Header } from "@/components/common/Header"
import { ResultCard } from "@/components/review/ResultCard"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export default function ResultPage() {
  const { t } = useLanguage()

  return (
    <div className={styles.page}>
      <Header title={t.result.title} showBack />
      <main className={styles.main}>
        <ResultCard />
      </main>
      <BottomNav />
    </div>
  )
}
