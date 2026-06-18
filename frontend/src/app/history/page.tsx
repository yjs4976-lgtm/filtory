"use client"

import { AppShell } from "@/components/common/AppShell"
import { HistoryList } from "@/components/history/HistoryList"
import { useLanguage } from "@/context/LanguageContext"

export default function HistoryPage() {
  const { t } = useLanguage()

  return (
    <AppShell title={t.history.title} showBack>
      <HistoryList />
    </AppShell>
  )
}
