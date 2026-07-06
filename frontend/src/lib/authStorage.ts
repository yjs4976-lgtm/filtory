import type { LoginResponse, User } from "./types"

const USER_STORAGE_KEY = "filtory-auth-user"

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage)
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

export function saveAuthSession(payload: LoginResponse) {
  if (!canUseStorage()) return

  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(payload.user))
}

export function saveStoredUser(user: User) {
  if (!canUseStorage()) return
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
}

export function clearAuthSession() {
  if (!canUseStorage()) return

  window.localStorage.removeItem(USER_STORAGE_KEY)
}
