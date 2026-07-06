"use client"

import { AppShell } from "@/components/common/AppShell"
import { HistoryManager } from "@/components/history/HistoryManager"
import { useLanguage } from "@/context/LanguageContext"

export default function HistoryPage() {
  const { t } = useLanguage()
  return (
    <AppShell title={t.history.title} showBack>
      <HistoryManager />
    </AppShell>
  )
}
