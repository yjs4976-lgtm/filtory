"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bell, Menu, ShieldCheck, UserRound } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/lib/routes"
import type { NotificationItem } from "@/lib/types"
import { notificationService } from "@/services/notificationService"
import { LanguageToggle } from "./LanguageToggle"
import { NotificationBottomSheet } from "./NotificationBottomSheet"
import { SidebarNav } from "./SidebarNav"
import { ChatbotModal } from "@/components/chatbot/ChatbotModal"
import styles from "@/styles/App.module.css"

export function Header({ title = "", showBack = false, showBrand = false, showBell = false }) {
  const router = useRouter()
  const { t } = useLanguage()
  const { user, isLoading } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isChatbotOpen, setIsChatbotOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const displayName = user?.nickname || user?.name || t.nav.my
  const unreadNotificationCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  )

  useEffect(() => {
    if (!showBell) return

    let alive = true
    notificationService.getNotifications().then((nextItems) => {
      if (!alive) return
      setNotifications(nextItems)
    })

    return () => {
      alive = false
    }
  }, [showBell])

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
            {showBack ? (
              <button
                type="button"
                onClick={() => router.back()}
                aria-label={t.common.back}
                className={styles.iconButton}
              >
                <ArrowLeft className={styles.iconMd} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label={t.nav.sidebarLabel}
                className={`${styles.iconButton} ${styles.mobileMenuButton}`}
              >
                <Menu className={styles.iconMd} />
              </button>
            )}
            {showBrand ? (
              <Link href="/" className={styles.brandLink}>
                <span className={styles.brandMark}>
                  <ShieldCheck className={styles.iconMd} />
                </span>
                <span className={styles.brandText}>{t.appName}</span>
              </Link>
            ) : (
              <h1 className={styles.headerTitle} title={title}>{title}</h1>
            )}
          </div>

          <div className={styles.headerActions}>
            <LanguageToggle />
            {showBack && (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label={t.nav.sidebarLabel}
                className={`${styles.iconButton} ${styles.mobileMenuButton}`}
              >
                <Menu className={styles.iconMd} />
              </button>
            )}
            {!isLoading && (
              user ? (
                <Link href={ROUTES.MYPAGE} className={styles.profileChip} aria-label={t.common.mypage} title={displayName}>
                  <UserRound className={styles.iconSm} />
                  <span>{displayName}</span>
                </Link>
              ) : (
                <Link href={ROUTES.LOGIN} className={styles.headerLoginButton}>
                  {t.common.login}
                </Link>
              )
            )}
            {showBell && (
              <button
                type="button"
                aria-label={t.notificationCenter.title}
                className={styles.iconButton}
                onClick={() => setNotificationOpen(true)}
              >
                <Bell className={styles.iconMd} />
                {unreadNotificationCount > 0 && <span className={styles.notificationDot} />}
              </button>
            )}
          </div>
        </div>
      </header>
      <SidebarNav variant="drawer" isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} onChatbotOpen={() => setIsChatbotOpen(true)} />
      <ChatbotModal open={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
      <NotificationBottomSheet
        open={notificationOpen}
        items={notifications}
        onItemsChange={setNotifications}
        onClose={() => setNotificationOpen(false)}
      />
    </>
  )
}
