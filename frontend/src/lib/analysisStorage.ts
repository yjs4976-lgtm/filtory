import type { AnalysisHistoryItem, CurrentReviewAnalysis } from "./types"

const STORAGE_KEY = "filtory-analysis-history"
const LEGACY_STORAGE_KEYS = ["analysisHistory", "reviewHistory", "filtory-review-history"]
const CURRENT_ANALYSIS_KEY = "filtory-current-review-analysis"

function normalizeStoredHistoryItem(item: Record<string, unknown>): AnalysisHistoryItem | null {
  const rawName = item.hospitalName ?? item.hospital_name ?? item.name
  const hospitalName =
    typeof rawName === "string"
      ? rawName
      : rawName && typeof rawName === "object" && "ko" in rawName
        ? String((rawName as { ko?: unknown }).ko ?? "")
        : ""
  const rawCategory = String(item.category ?? item.hospitalCategory ?? "").trim()
  const category =
    rawCategory === "eye" || rawCategory === "안과" || rawCategory === "ophthalmology"
      ? "eye"
      : rawCategory === "dental" || rawCategory === "치과" || rawCategory === "dentistry"
        ? "dental"
        : "derma"
  const createdAt = String(item.createdAt ?? item.created_at ?? item.analyzedAt ?? item.date ?? "")
  const id = String(item.id ?? "")

  if (!id || !hospitalName) return null

  return {
    ...item,
    id,
    hospitalName,
    category,
    createdAt,
    analyzedAt: item.analyzedAt ? String(item.analyzedAt) : undefined,
    deletedAt: item.deletedAt || item.deleted_at ? String(item.deletedAt ?? item.deleted_at) : null,
    deletedBy: item.deletedBy || item.deleted_by ? String(item.deletedBy ?? item.deleted_by) : null,
    score: Number(item.score ?? item.total_score ?? item.trustScore ?? item.trust_score ?? 0),
    trustScore: Number(item.trustScore ?? item.trust_score ?? item.score ?? 0),
  } as AnalysisHistoryItem
}

function readHistoryFromStorageKey(key: string): AnalysisHistoryItem[] {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((item) => normalizeStoredHistoryItem(item as Record<string, unknown>))
      .filter((item): item is AnalysisHistoryItem => Boolean(item))
  } catch {
    return []
  }
}

export function readAnalysisHistory(): AnalysisHistoryItem[] {
  if (typeof window === "undefined") return []

  const itemsById = new Map<string, AnalysisHistoryItem>()
  for (const item of readHistoryFromStorageKey(STORAGE_KEY)) {
    itemsById.set(item.id, item)
  }
  for (const legacyKey of LEGACY_STORAGE_KEYS) {
    for (const item of readHistoryFromStorageKey(legacyKey)) {
      if (!itemsById.has(item.id)) itemsById.set(item.id, item)
    }
  }

  return Array.from(itemsById.values())
}

export function readActiveAnalysisHistory(): AnalysisHistoryItem[] {
  return readAnalysisHistory().filter((item) => !item.deletedAt)
}

export function readTrashedAnalysisHistory(): AnalysisHistoryItem[] {
  return readAnalysisHistory().filter((item) => Boolean(item.deletedAt))
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

export function moveAnalysisHistoryItemsToTrash(ids: string[], deletedBy?: string | number | null) {
  const idSet = new Set(ids)
  const deletedAt = new Date().toISOString()
  const items = readAnalysisHistory()
  writeAnalysisHistory(
    items.map((item) => (
      idSet.has(item.id)
        ? { ...item, deletedAt, deletedBy: deletedBy ?? null }
        : item
    ))
  )
}

export function restoreAnalysisHistoryItems(ids: string[]) {
  const idSet = new Set(ids)
  const items = readAnalysisHistory()
  writeAnalysisHistory(
    items.map((item) => (
      idSet.has(item.id)
        ? { ...item, deletedAt: null, deletedBy: null }
        : item
    ))
  )
}

export function permanentlyDeleteAnalysisHistoryItems(ids: string[]) {
  const idSet = new Set(ids)
  const items = readAnalysisHistory()
  writeAnalysisHistory(items.filter((item) => !idSet.has(item.id)))
}

export function emptyAnalysisHistoryTrash() {
  const items = readAnalysisHistory()
  writeAnalysisHistory(items.filter((item) => !item.deletedAt))
}

export function readCurrentReviewAnalysis(): CurrentReviewAnalysis | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(CURRENT_ANALYSIS_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed?.id || !parsed?.hospitalName || !parsed?.category || !parsed?.analyzedAt) {
      return null
    }

    return parsed as CurrentReviewAnalysis
  } catch {
    return null
  }
}

export function writeCurrentReviewAnalysis(item: CurrentReviewAnalysis) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(CURRENT_ANALYSIS_KEY, JSON.stringify(item))
}
