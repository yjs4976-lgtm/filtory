"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { AccountSecurityCard } from "@/components/mypage/AccountSecurityCard"
import { LoginHistoryList } from "@/components/mypage/LoginHistoryList"
import { PasswordChangeForm } from "@/components/mypage/PasswordChangeForm"
import { SocialProviderList } from "@/components/mypage/SocialProviderList"
import { useAuth } from "@/hooks/useAuth"
import type { LoginHistory } from "@/lib/types"
import { securityService } from "@/services/securityService"
import styles from "@/styles/App.module.css"

export default function MySecurityPage() {
  const { user, logout } = useAuth()
  const [history, setHistory] = useState<LoginHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let alive = true
    securityService.getLoginHistory().then((items) => {
      if (!alive) return
      setHistory(items)
      setIsLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  const handleLogoutAllDevices = async () => {
    const ok = window.confirm("모든 기기에서 로그아웃할까요?")
    if (!ok) return
    await securityService.logoutAllDevices()
    await logout()
  }

  return (
    <ProtectedRoute>
      <AppShell title="계정 보안" showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>계정 보안</h1>
          <p className={styles.bodyText}>로그인 방식, 연결된 계정, 비밀번호를 안전하게 관리해요.</p>
        </section>
        <AccountSecurityCard user={user} />
        <SocialProviderList user={user} />
        <PasswordChangeForm />
        {isLoading ? <LoadingSpinner label="로그인 기록을 불러오고 있어요." /> : <LoginHistoryList items={history} />}
        <button type="button" className={styles.dangerButton} onClick={handleLogoutAllDevices}>
          모든 기기에서 로그아웃
        </button>
      </AppShell>
    </ProtectedRoute>
  )
}
