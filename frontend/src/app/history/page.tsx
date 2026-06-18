import { AppShell } from "@/components/common/AppShell"
import { HistoryList } from "@/components/history/HistoryList"

export default function HistoryPage() {
  return (
    <AppShell title="분석 기록" showBack>
      <HistoryList />
    </AppShell>
  )
}
