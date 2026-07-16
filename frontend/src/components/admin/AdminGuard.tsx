"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/lib/routes"

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAdmin, isAuthenticated, isLoading } = useAuth()
  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace(`${ROUTES.LOGIN}?redirect=${encodeURIComponent(pathname)}`)
      return
    }
    if (!isAdmin) {
      router.replace(ROUTES.UNAUTHORIZED)
    }
  }, [isAdmin, isAuthenticated, isLoading, pathname, router])
  if (isLoading || !isAuthenticated || !isAdmin) return <LoadingSpinner label="관리자 권한을 확인하고 있어요." />
  return <>{children}</>
}
