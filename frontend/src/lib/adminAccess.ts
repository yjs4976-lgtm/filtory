// TODO: Replace this temporary allowlist with a server-verified ADMIN role.
export const ADMIN_EMAIL_ALLOWLIST = [
  "yjs4976@gmail.com",
  "jojeonghwa93@gmail.com",
] as const

export function isAdminRole(role?: string | null) {
  return String(role ?? "").toUpperCase() === "ADMIN"
}

function isAllowedAdminEmail(email?: string | null) {
  if (!email) return false
  return ADMIN_EMAIL_ALLOWLIST.some((adminEmail) => adminEmail === email.trim().toLowerCase())
}

function isMockAdminAccessEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_MOCK_ADMIN_ACCESS === "true"
}

// 개발/mock 화면 확인 전용 보정입니다. 운영 보안으로 사용하지 않으며 production에서는
// 일반 사용자를 ADMIN으로 승격하지 않습니다. 실제 권한은 backend-main /me 응답의 role과
// 서버 검증을 기준으로 해야 합니다.
// TODO: Assign ADMIN role only through a secure backend process.
export function withMockAdminRole<T extends { email?: string | null; role: "USER" | "ADMIN" }>(user: T): T {
  return isMockAdminAccessEnabled() && isAllowedAdminEmail(user.email) && !isAdminRole(user.role)
    ? { ...user, role: "ADMIN" }
    : user
}
