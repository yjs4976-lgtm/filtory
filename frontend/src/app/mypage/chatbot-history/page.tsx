"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MessageCircle, Trash2 } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { AppShell } from "@/components/common/AppShell"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import {
  deleteAllChatbotConversations,
  deleteChatbotConversation,
  listChatbotConversations,
  type ChatbotConversation,
} from "@/services/chatbotService"
import styles from "@/styles/App.module.css"

const PAGE_SIZE = 50

export default function ChatbotHistoryPage() {
  const { language, t } = useLanguage()
  const [items, setItems] = useState<ChatbotConversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let alive = true

    async function load() {
      setIsLoading(true)
      setError("")
      try {
        const result = await listChatbotConversations(PAGE_SIZE)
        if (!alive) return
        setItems(result.data)
      } catch {
        if (!alive) return
        setItems([])
        setError(t.mypage.chatbotHistoryLoadFailed)
      } finally {
        if (alive) setIsLoading(false)
      }
    }

    void load()

    return () => {
      alive = false
    }
  }, [t.mypage.chatbotHistoryLoadFailed])

  async function handleDelete(id: number) {
    if (isDeleting || !window.confirm(t.mypage.chatbotHistoryDeleteConfirm)) return
    setIsDeleting(true)
    setMessage("")
    setError("")
    try {
      await deleteChatbotConversation(id)
      setItems((current) => current.filter((item) => item.id !== id))
      setMessage(t.mypage.chatbotHistoryDeleted)
    } catch {
      setError(t.mypage.chatbotHistoryDeleteFailed)
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleClearAll() {
    if (isDeleting || items.length === 0 || !window.confirm(t.mypage.chatbotHistoryClearConfirm)) return
    setIsDeleting(true)
    setMessage("")
    setError("")
    try {
      await deleteAllChatbotConversations()
      setItems([])
      setMessage(t.mypage.chatbotHistoryCleared)
    } catch {
      setError(t.mypage.chatbotHistoryDeleteFailed)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <ProtectedRoute>
      <AppShell title={t.mypage.chatbotHistoryPageTitle} showBack>
        <section className={styles.stackSm}>
          <h1 className={styles.titleLg}>{t.mypage.chatbotHistoryPageTitle}</h1>
          <p className={styles.bodyText}>{t.mypage.chatbotHistoryPageDescription}</p>
        </section>

        {message && <p className={styles.formSuccess}>{message}</p>}
        {error && <p className={styles.formError}>{error}</p>}

        {isLoading ? (
          <LoadingSpinner label={t.mypage.chatbotHistoryLoading} />
        ) : items.length === 0 ? (
          <section className={`${styles.emptyCard} ${styles.stackSm}`}>
            <span className={`${styles.iconBoxRound} ${styles.iconLavender}`}>
              <MessageCircle className={styles.iconMd} />
            </span>
            <h2 className={styles.titleMd}>{t.mypage.chatbotHistoryEmptyTitle}</h2>
            <p className={styles.bodyText}>{t.mypage.chatbotHistoryEmptyDescription}</p>
            <Link href={ROUTES.CHATBOT} className={styles.secondaryButton}>
              {t.mypage.openChatbot}
            </Link>
          </section>
        ) : (
          <section className={styles.stackSm}>
            <button type="button" className={styles.dangerButton} onClick={handleClearAll} disabled={isDeleting}>
              <Trash2 className={styles.iconSm} />
              {t.common.clearAll}
            </button>
            <div className={styles.recordList}>
              {items.map((item) => (
                <article key={item.id} className={styles.recordButton}>
                  <span className={`${styles.iconBoxSmall} ${styles.iconLavender}`}>
                    <MessageCircle className={styles.iconSm} />
                  </span>
                  <span className={styles.recordBody}>
                    <span className={styles.recordName}>{item.title}</span>
                    <span className={styles.recordDate}>
                      {formatChatbotHistoryMeta(item, language, t.mypage.chatbotHistoryCount)}
                    </span>
                    {item.lastMessagePreview && (
                      <span className={styles.recordDate}>{item.lastMessagePreview}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    className={styles.chatHistoryDeleteButton}
                    aria-label={t.mypage.deleteRecord}
                    onClick={() => handleDelete(item.id)}
                    disabled={isDeleting}
                  >
                    <Trash2 className={styles.iconSm} />
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
      </AppShell>
    </ProtectedRoute>
  )
}

function formatChatbotHistoryMeta(item: ChatbotConversation, language: "ko" | "en", countTemplate: string) {
  const date = item.updatedAt || item.createdAt
  const formattedDate = date
    ? new Intl.DateTimeFormat(language === "en" ? "en-US" : "ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))
    : ""
  const count = countTemplate.replace("{count}", String(item.messageCount || 0))
  return formattedDate ? `${formattedDate} · ${count}` : count
}
