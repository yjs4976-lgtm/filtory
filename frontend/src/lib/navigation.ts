export function sanitizeInternalNextPath(value: string | null | undefined): string | null {
  const rawValue = value?.trim()
  if (!rawValue) return null
  if (!rawValue.startsWith("/")) return null
  if (rawValue.startsWith("//")) return null
  if (rawValue.includes("\\")) return null

  let decodedValue = rawValue
  try {
    decodedValue = decodeURIComponent(rawValue)
  } catch {
    return null
  }

  if (!decodedValue.startsWith("/")) return null
  if (decodedValue.startsWith("//")) return null
  if (decodedValue.includes("\\")) return null

  const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin

  try {
    const resolved = new URL(rawValue, origin)
    if (resolved.origin !== origin) return null
    return `${resolved.pathname}${resolved.search}${resolved.hash}`
  } catch {
    return null
  }
}
