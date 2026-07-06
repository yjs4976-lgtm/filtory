"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { AccountSecurityCard } from "@/components/mypage/AccountSecurityCard"
import { LoginHistoryList } from "@/components/mypage/LoginHistoryList"
import { PasswordChangeForm } from "@/components/mypage/PasswordChangeForm"
import { SocialProviderList } from "@/components/mypage/SocialProviderList"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import type { LoginHistory } from "@/lib/types"
import { securityService } from "@/services/securityService"
import styles from "@/styles/App.module.css"

export default function MySecurityPage() {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const section = searchParams.get("section")
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
    const ok = window.confirm(t.mypage.logoutAllDevicesConfirm)
    if (!ok) return
    await securityService.logoutAllDevices()
    await logout()
  }

  return (
    <ProtectedRoute>
      <AppShell title={t.mypage.securityPageTitle} showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>{t.mypage.securityPageTitle}</h1>
          <p className={styles.bodyText}>{t.mypage.securityPageDescription}</p>
        </section>
        {section === "password" && <PasswordChangeForm />}
        {section === "social" && <SocialProviderList user={user} />}
        {section === "login" && <>
          <AccountSecurityCard user={user} />
          {isLoading ? <LoadingSpinner label={t.mypage.loadingLoginHistory} /> : <LoginHistoryList items={history} />}
          <button type="button" className={styles.dangerButton} onClick={handleLogoutAllDevices}>{t.mypage.logoutAllDevices}</button>
        </>}
        {!section && <>
          <AccountSecurityCard user={user} />
          <SocialProviderList user={user} />
          <PasswordChangeForm />
          {isLoading ? <LoadingSpinner label={t.mypage.loadingLoginHistory} /> : <LoginHistoryList items={history} />}
        </>}
      </AppShell>
    </ProtectedRoute>
  )
}
