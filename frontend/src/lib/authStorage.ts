import type { LoginResponse, User } from "./types"

const USER_STORAGE_KEY = "filtory-auth-user"
const ACCESS_TOKEN_STORAGE_KEY = "filtory-access-token"
const REFRESH_TOKEN_STORAGE_KEY = "filtory-refresh-token"

type TokenPayload = {
  accessToken?: unknown
  refreshToken?: unknown
  access_token?: unknown
  refresh_token?: unknown
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage)
}

export function readAccessToken() {
  if (!canUseStorage()) return ""
  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) || ""
}

export function readRefreshToken() {
  if (!canUseStorage()) return ""
  return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || ""
}

export function readStoredUser(): User | null {
  if (!canUseStorage()) return null

  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function saveAuthTokens(payload: TokenPayload) {
  if (!canUseStorage()) return

  const accessToken = readString(payload.accessToken ?? payload.access_token)
  const refreshToken = readString(payload.refreshToken ?? payload.refresh_token)

  if (accessToken) {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken)
  }

  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken)
  }
}

export function saveAuthSession(payload: LoginResponse) {
  if (!canUseStorage()) return

  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(payload.user))
  saveAuthTokens(payload)
}

export function saveStoredUser(user: User) {
  if (!canUseStorage()) return
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
}

export function clearAuthSession() {
  if (!canUseStorage()) return

  window.localStorage.removeItem(USER_STORAGE_KEY)
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
  window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
}
