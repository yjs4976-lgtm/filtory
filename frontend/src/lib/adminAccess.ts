// TODO: Replace this temporary allowlist with a server-verified ADMIN role.
export const ADMIN_EMAIL_ALLOWLIST = [
  "yjs4976@gmail.com",
  "jojeonghwa93@gmail.com",
] as const

function isAllowedAdminEmail(email?: string | null) {
  if (!email) return false
  return ADMIN_EMAIL_ALLOWLIST.some((adminEmail) => adminEmail === email.trim().toLowerCase())
}

// 개발용 mock 인증 보정입니다. 실제 서비스에서는 백엔드/DB의 안전한 운영 절차로만
// ADMIN role을 부여하고 이 함수를 제거합니다.
// TODO: Assign ADMIN role only through a secure backend process.
export function withMockAdminRole<T extends { email?: string | null; role: "USER" | "ADMIN" }>(user: T): T {
  return isAllowedAdminEmail(user.email) && user.role !== "ADMIN"
    ? { ...user, role: "ADMIN" }
    : user
}
