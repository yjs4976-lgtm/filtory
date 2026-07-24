"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { isAdminRole } from "@/lib/adminAccess"
import { sanitizeAuthRedirectPath } from "@/lib/navigation"
import { ROUTES } from "@/lib/routes"
import { getWorkspaceStartPath, readWorkspaceSettings } from "@/lib/workspace"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function AuthEntryGuard({ children }: { children: ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLogin, isLoading } = useAuth()
  const { t } = useLanguage()
  const entryAuthResolvedRef = useRef(false)
  const requestedPath = sanitizeAuthRedirectPath(
    searchParams.get("redirect") ?? searchParams.get("next")
  )
  useEffect(() => {
    if (isLoading || entryAuthResolvedRef.current) return
    entryAuthResolvedRef.current = true
    if (!isLogin || !user) return
    if (requestedPath?.startsWith(ROUTES.ADMIN) && !isAdminRole(user.role)) {
      router.replace(ROUTES.UNAUTHORIZED)
      return
    }
    const fallback = isAdminRole(user.role)
      ? getWorkspaceStartPath(readWorkspaceSettings(user))
      : ROUTES.HOME
    router.replace(requestedPath ?? fallback)
  }, [isLoading, isLogin, requestedPath, router, user])

  if (isLoading) {
    return (
      <div className={styles.loadingPage}>
        <LoadingSpinner label={t.auth.checkingLogin} />
      </div>
    )
  }

  return <>{children}</>
}
