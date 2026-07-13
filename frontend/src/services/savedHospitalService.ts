import type { HospitalItem, SavedHospital } from "@/lib/types"
import { apiClient } from "./apiClient"

export type FavoriteHospitalQuery = { page?: number; size?: number; category?: string; status?: "analyzed" | "not_analyzed"; sort?: "latest" | "oldest" | "name"; keyword?: string }
export type FavoriteHospitalPage = { items: SavedHospital[]; total: number; totalPages: number; page: number }

let favoriteCache: SavedHospital[] | null = null
let favoriteRequest: Promise<SavedHospital[]> | null = null

function hospitalExternalIdentity(hospital: HospitalItem) {
  const provider = String(hospital.provider || hospital.sourceProvider || (hospital.naverPlaceId ? "naver" : hospital.googlePlaceId ? "google" : "external")).toLowerCase()
  const prefixedId = String(hospital.id).startsWith(`${provider}:`) ? String(hospital.id).slice(provider.length + 1) : undefined
  const externalId = hospital.externalPlaceId || hospital.naverPlaceId || hospital.googlePlaceId || prefixedId
  return externalId ? `external:${provider}:${externalId}` : null
}

export function favoriteHospitalIdentity(hospital: HospitalItem) {
  const internalId = getInternalFavoriteHospitalId(hospital)
  return internalId ? `internal:${internalId}` : hospitalExternalIdentity(hospital)
}

function savedExternalIdentity(hospital: SavedHospital) {
  return hospital.externalPlaceId ? `external:${String(hospital.sourceProvider || "external").toLowerCase()}:${hospital.externalPlaceId}` : null
}

export function isInternalFavoriteHospital(hospital: HospitalItem) {
  return Boolean(getInternalFavoriteHospitalId(hospital))
}

export function getInternalFavoriteHospitalId(hospital: HospitalItem) {
  if (hospital.internalHospitalId && hospital.internalHospitalId > 0) return hospital.internalHospitalId
  const provider = String(hospital.provider || hospital.sourceProvider || "").toLowerCase()
  return /^\d+$/.test(String(hospital.id)) && (!provider || provider === "filtory") && !hospital.externalPlaceId ? Number(hospital.id) : undefined
}

export function canSaveFavoriteHospital(hospital: HospitalItem) {
  return Boolean(hospital.name?.trim() && hospital.category && (isInternalFavoriteHospital(hospital) || hospitalExternalIdentity(hospital)))
}

export function findSavedFavorite(hospital: HospitalItem, favorites: SavedHospital[]) {
  const internalId = getInternalFavoriteHospitalId(hospital)
  if (internalId) return favorites.find((item) => item.id === internalId)
  const externalIdentity = hospitalExternalIdentity(hospital)
  if (externalIdentity) return favorites.find((item) => savedExternalIdentity(item) === externalIdentity)
  return undefined
}

async function loadAllFavorites() {
  if (favoriteCache) return favoriteCache
  if (favoriteRequest) return favoriteRequest
  favoriteRequest = (async () => {
    const items: SavedHospital[] = []
    let page = 1
    let totalPages = 1
    do {
      const result = await savedHospitalService.getFavoriteHospitals({ page, size: 50, sort: "latest" })
      items.push(...result.items); totalPages = result.totalPages; page += 1
    } while (page <= totalPages)
    favoriteCache = items
    return items
  })().finally(() => { favoriteRequest = null })
  return favoriteRequest
}

function cacheSaved(item: SavedHospital) {
  if (!favoriteCache) {
    if (favoriteRequest) void favoriteRequest.then(() => cacheSaved(item))
    return
  }
  favoriteCache = [item, ...favoriteCache.filter((current) => current.id !== item.id)]
}

function cacheRemoved(hospitalId: number) {
  if (favoriteCache) {
    favoriteCache = favoriteCache.filter((item) => item.id !== hospitalId)
  } else if (favoriteRequest) {
    void favoriteRequest.then(() => cacheRemoved(hospitalId))
  }
}

export function clearFavoriteHospitalCache() { favoriteCache = null; favoriteRequest = null }
export function emitFavoriteHospitalChange(hospital: HospitalItem, favorite: boolean, savedId?: number) {
  const identity = favoriteHospitalIdentity(hospital)
  if (identity && typeof window !== "undefined") window.dispatchEvent(new CustomEvent("filtory:favorite-changed", { detail: { identity, favorite, savedId } }))
}

export const savedHospitalService = {
  async getFavoriteHospitals(query: FavoriteHospitalQuery = {}): Promise<FavoriteHospitalPage> {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => value !== undefined && value !== "" && params.set(key, String(value)))
    const result = await apiClient<SavedHospital[]>(`/api/favorite-hospitals?${params}`, { auth: true })
    return { items: result.data, total: result.meta?.total ?? result.data.length, totalPages: result.meta?.totalPages ?? 1, page: result.meta?.page ?? 1 }
  },
  async resolveFavorite(hospital: HospitalItem) { return findSavedFavorite(hospital, await loadAllFavorites()) },
  async getAllFavoriteHospitals() { return loadAllFavorites() },
  async getSavedHospitals(_memberId?: unknown) { void _memberId; return (await this.getFavoriteHospitals({ size: 20 })).items },
  async saveHospital(_memberId: unknown, hospitalId: number, analysisResultId?: number) {
    const result = await apiClient<SavedHospital>("/api/favorite-hospitals", { method: "POST", body: { hospitalId, analysisResultId }, auth: true }); cacheSaved(result.data); return result.data
  },
  async saveExternalHospital(hospital: HospitalItem) {
    const provider = hospital.provider || hospital.sourceProvider || (hospital.naverPlaceId ? "naver" : hospital.googlePlaceId ? "google" : "external")
    const prefixedId = String(hospital.id).startsWith(`${String(provider).toLowerCase()}:`) ? String(hospital.id).slice(String(provider).length + 1) : undefined
    const externalPlaceId = hospital.externalPlaceId || hospital.naverPlaceId || hospital.googlePlaceId || prefixedId
    const result = await apiClient<SavedHospital>("/api/favorite-hospitals", { method: "POST", body: { hospital: { ...hospital, externalPlaceId, provider } }, auth: true }); cacheSaved(result.data); return result.data
  },
  async unsaveHospital(_memberId: unknown, hospitalId: number) {
    await apiClient(`/api/favorite-hospitals/${hospitalId}`, { method: "DELETE", auth: true }); cacheRemoved(hospitalId); return { success: true, deletedId: hospitalId }
  },
}
