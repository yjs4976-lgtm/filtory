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
  const { language, t } = useLanguage()
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
    setMessage(t.mypage.settingsSaved)
  }

  return (
    <ProtectedRoute>
      <AppShell title={t.mypage.settingsPageTitle} showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>{t.mypage.settingsPageTitle}</h1>
          <p className={styles.bodyText}>{t.mypage.settingsPageDescription}</p>
        </section>
        {!settings ? (
          <LoadingSpinner label={t.mypage.loadingSettings} />
        ) : (
          <>
            {message && <p className={styles.formSuccess}>{message}</p>}
            <NotificationSettings value={settings} onChange={setSettings} />
            <LanguageSettings />
            <ThemeSettings value={theme} onChange={setTheme} />
            <button type="button" className={styles.primaryButton} onClick={handleSave}>
              {t.mypage.saveSettings}
            </button>
          </>
        )}
      </AppShell>
    </ProtectedRoute>
  )
}
