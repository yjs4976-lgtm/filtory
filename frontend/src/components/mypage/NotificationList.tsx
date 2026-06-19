"use client"

import { useEffect, useMemo, useState } from "react"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import type { NotificationItem } from "@/lib/types"
import { notificationService } from "@/services/notificationService"
import { useLanguage } from "@/context/LanguageContext"
import { NotificationCard } from "./NotificationCard"
import { NotificationEmpty } from "./NotificationEmpty"
import styles from "@/styles/App.module.css"

export function NotificationList() {
  const { t } = useLanguage()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items])

  useEffect(() => {
    let alive = true
    notificationService.getNotifications().then((nextItems) => {
      if (!alive) return
      setItems(nextItems)
      setIsLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsRead()
    setItems((prevItems) => prevItems.map((item) => ({ ...item, isRead: true })))
  }

  if (isLoading) return <LoadingSpinner label={t.mypage.notificationLoading} />
  if (items.length === 0) return <NotificationEmpty />

  return (
    <section className={styles.stackSm}>
      <div className={styles.rowBetween}>
        <span className={styles.neutralPill}>{t.mypage.unreadCount.replace("{count}", String(unreadCount))}</span>
        <button type="button" className={styles.smallPillButton} onClick={handleMarkAllAsRead}>
          {t.mypage.markAllRead}
        </button>
      </div>
      <div className={styles.recordList}>
        {items.map((item) => (
          <NotificationCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}
