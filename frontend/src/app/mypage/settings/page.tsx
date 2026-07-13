"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { LanguageSettings } from "@/components/mypage/LanguageSettings"
import { NotificationSettings } from "@/components/mypage/NotificationSettings"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import type { NotificationSettings as NotificationSettingsType } from "@/lib/types"
import { settingService } from "@/services/settingService"
import styles from "@/styles/App.module.css"

export default function MySettingsPage() {
  const { language, t } = useLanguage()
  const [settings, setSettings] = useState<NotificationSettingsType | null>(null)
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
    await settingService.saveSettings({ ...settings, language })
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
            <Link href={ROUTES.MYPAGE_CHATBOT_HISTORY} className={styles.secondaryButton}>
              {t.mypage.chatbotHistoryManage}
            </Link>
            <button type="button" className={styles.primaryButton} onClick={handleSave}>
              {t.mypage.saveSettings}
            </button>
          </>
        )}
      </AppShell>
    </ProtectedRoute>
  )
}
