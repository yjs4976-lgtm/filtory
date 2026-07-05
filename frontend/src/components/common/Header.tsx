"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bell, Menu, UserRound } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/lib/routes"
import type { NotificationItem } from "@/lib/types"
import { notificationService } from "@/services/notificationService"
import { LanguageToggle } from "./LanguageToggle"
import { LogoMark } from "./LogoMark"
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
  const [notificationTotal, setNotificationTotal] = useState(0)
  const [notificationPage, setNotificationPage] = useState(1)
  const [isNotificationLoadingMore, setIsNotificationLoadingMore] = useState(false)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const userId = user?.id
  const visibleNotifications = useMemo(() => (userId ? notifications : []), [notifications, userId])
  const visibleUnreadNotificationCount = userId ? unreadNotificationCount : 0
  const displayName = user?.nickname || user?.name || t.nav.my

  useEffect(() => {
    if (!showBell) return
    if (isLoading) return
    if (!userId) return

    let alive = true
    Promise.all([
      notificationService.getNotifications(1, 20),
      notificationService.getUnreadCount(),
    ])
      .then(([notificationPage, unreadCount]) => {
        if (!alive) return
        setNotifications(notificationPage.items)
        setNotificationTotal(notificationPage.total)
        setNotificationPage(notificationPage.page)
        setUnreadNotificationCount(unreadCount)
      })
      .catch(() => {
        if (!alive) return
        setNotifications([])
        setNotificationTotal(0)
        setNotificationPage(1)
        setUnreadNotificationCount(0)
      })

    return () => {
      alive = false
    }
  }, [isLoading, showBell, userId])

  const loadMoreNotifications = async () => {
    if (isNotificationLoadingMore || visibleNotifications.length >= notificationTotal) return
    try {
      setIsNotificationLoadingMore(true)
      const nextPage = notificationPage + 1
      const result = await notificationService.getNotifications(nextPage, 20)
      setNotifications((current) => [...current, ...result.items])
      setNotificationTotal(result.total)
      setNotificationPage(result.page)
    } finally {
      setIsNotificationLoadingMore(false)
    }
  }

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
                  <LogoMark size={32} className={styles.brandMarkImage} />
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
                {visibleUnreadNotificationCount > 0 && <span className={styles.notificationDot} />}
              </button>
            )}
          </div>
        </div>
      </header>
      <SidebarNav variant="drawer" isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} onChatbotOpen={() => setIsChatbotOpen(true)} />
      <ChatbotModal open={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
      <NotificationBottomSheet
        open={notificationOpen}
        items={visibleNotifications}
        onItemsChange={setNotifications}
        total={notificationTotal}
        isLoadingMore={isNotificationLoadingMore}
        onLoadMore={loadMoreNotifications}
        onUnreadCountChange={setUnreadNotificationCount}
        onClose={() => setNotificationOpen(false)}
      />
    </>
  )
}
