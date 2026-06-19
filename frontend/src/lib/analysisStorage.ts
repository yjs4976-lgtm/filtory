import type { AnalysisHistoryItem } from "./types"

const STORAGE_KEY = "filtory-analysis-history"

export function readAnalysisHistory(): AnalysisHistoryItem[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((item): item is AnalysisHistoryItem => {
      return Boolean(item?.id && item?.hospitalName && item?.category && item?.createdAt)
    })
  } catch {
    return []
  }
}

export function writeAnalysisHistory(items: AnalysisHistoryItem[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function saveAnalysisHistoryItem(item: AnalysisHistoryItem) {
  const items = readAnalysisHistory()
  const nextItems = [item, ...items.filter((current) => current.id !== item.id)]
  writeAnalysisHistory(nextItems)
  return item
}

export function deleteAnalysisHistoryItem(id: string) {
  const items = readAnalysisHistory()
  writeAnalysisHistory(items.filter((item) => item.id !== id))
}
