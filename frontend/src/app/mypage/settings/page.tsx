"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { LanguageSettings } from "@/components/mypage/LanguageSettings"
import { NotificationSettings } from "@/components/mypage/NotificationSettings"
import { ThemeSettings } from "@/components/mypage/ThemeSettings"
import { useLanguage } from "@/context/LanguageContext"
import type { NotificationSettings as NotificationSettingsType } from "@/lib/types"
import { settingService, type AppTheme } from "@/services/settingService"
import styles from "@/styles/App.module.css"

export default function MySettingsPage() {
  const { language } = useLanguage()
  const [settings, setSettings] = useState<NotificationSettingsType | null>(null)
  const [theme, setTheme] = useState<AppTheme>("system")
  const [message, setMessage] = useState("")

  useEffect(() => {
    let alive = true
    settingService.getNotificationSettings().then((nextSettings) => {
      if (alive) setSettings(nextSettings)
    })
    return () => {
      alive = false
    }
  }, [])

  const handleSave = async () => {
    if (!settings) return
    await settingService.saveSettings({ ...settings, language, theme })
    setMessage("설정이 저장되었어요.")
  }

  return (
    <ProtectedRoute>
      <AppShell title="앱 설정" showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>앱 설정</h1>
          <p className={styles.bodyText}>알림, 언어, 화면 설정을 내 사용 방식에 맞게 조정해요.</p>
        </section>
        {!settings ? (
          <LoadingSpinner label="설정을 불러오고 있어요." />
        ) : (
          <>
            {message && <p className={styles.formSuccess}>{message}</p>}
            <NotificationSettings value={settings} onChange={setSettings} />
            <LanguageSettings />
            <ThemeSettings value={theme} onChange={setTheme} />
            <button type="button" className={styles.primaryButton} onClick={handleSave}>
              설정 저장
            </button>
          </>
        )}
      </AppShell>
    </ProtectedRoute>
  )
}
