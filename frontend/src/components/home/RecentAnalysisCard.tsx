import { HistoryCard } from "@/components/history/HistoryCard"
import type { AnalysisHistoryItem } from "@/lib/types"

export function RecentAnalysisCard({ item }: { item: AnalysisHistoryItem }) {
  return <HistoryCard item={item} />
}
