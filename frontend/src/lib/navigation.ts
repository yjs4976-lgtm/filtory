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

  // OAuth callback 뒤 이동할 경로는 현재 사이트 내부 경로만 허용한다.
  // 백슬래시와 인코딩된 외부 URL을 한 번 더 걸러 open redirect를 막는다.
  const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin

  try {
    const resolved = new URL(rawValue, origin)
    if (resolved.origin !== origin) return null
    return `${resolved.pathname}${resolved.search}${resolved.hash}`
  } catch {
    return null
  }
}
