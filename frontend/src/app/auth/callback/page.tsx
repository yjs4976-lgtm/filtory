import { Suspense } from "react"
import { AuthCallbackHandler } from "@/components/auth/AuthCallbackHandler"

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<p>소셜 로그인 처리 중...</p>}>
      <AuthCallbackHandler />
    </Suspense>
  )
}
