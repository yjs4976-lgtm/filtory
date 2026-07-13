"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import {
  CHATBOT_CONTEXT_EVENT,
  buildChatbotContextFromAnalysis,
  clearSelectedChatbotAnalysisContext,
  getAnalysisResultId,
  readSelectedChatbotAnalysisContextForUser,
  type ChatbotAnalysisContext,
} from "@/lib/chatbotContext"
import { readCurrentReviewAnalysis } from "@/lib/analysisStorage"
import { getHistoryHospitalName } from "@/lib/historyDisplay"
import { ROUTES } from "@/lib/routes"
import {
  getChatbotConversation,
  listChatbotConversations,
  sendChatMessage,
  type ChatbotConversation,
} from "@/services/chatbotService"
import { useAuth } from "@/hooks/useAuth"
import { ChatBubble } from "./ChatBubble"
import { ChatInput } from "./ChatInput"
import { RecommendedQuestions } from "./RecommendedQuestions"
import styles from "@/styles/App.module.css"

type ChatMessage = {
  id: number
  role: "ai" | "user"
  text: string
}

type RecommendedQuestionState = {
  language: string
  questions: string[]
}

type StoredLocalChatMessage = {
  role: "ai" | "user"
  text: string
}

const LOCAL_CHAT_HISTORY_KEY = "filtory-chatbot-local-history"
const MAX_LOCAL_CHAT_MESSAGES = 30
const MAX_SERVER_HISTORY_ITEMS = 10

function buildCurrentChatAnalysisContext() {
  const analysis = readCurrentReviewAnalysis()

  if (!analysis) return null

  return buildChatbotContextFromAnalysis(analysis, "current")
}

function detectMessageLanguage(message: string, fallback: "ko" | "en") {
  const hangulCount = (message.match(/[가-힣]/g) ?? []).length
  const latinCount = (message.match(/[A-Za-z]/g) ?? []).length

  if (hangulCount > 0) {
    if (/[가-힣](랑|은|는|이|가|을|를|에|에서|으로|로|도|만|랑|하고|이랑)\b|뭐|왜|어떻게|해줘|인가|야\??|나요\??/.test(message)) {
      return "ko"
    }
    const startsWithEnglish = /^[\s"'([{]*[A-Za-z]/.test(message)
    return startsWithEnglish && latinCount >= Math.max(12, hangulCount * 2) ? "en" : "ko"
  }
  if (latinCount > 0 && latinCount > hangulCount) return "en"
  return fallback
}

export function ChatWindow({ dockInput = false }: { dockInput?: boolean }) {
  const router = useRouter()
  const { t, language } = useLanguage()
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [recommendedQuestions, setRecommendedQuestions] = useState<RecommendedQuestionState | null>(null)
  const [selectedAnalysisResult, setSelectedAnalysisResult] = useState<ChatbotAnalysisContext | null>(null)
  const [connectedAnalysisResultId, setConnectedAnalysisResultId] = useState<number | null>(null)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [conversationAnalysisResultId, setConversationAnalysisResultId] = useState<number | null>(null)
  const [historyItems, setHistoryItems] = useState<ChatbotConversation[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isResponding, setIsResponding] = useState(false)
  const [areSuggestionsOpen, setAreSuggestionsOpen] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const nextMessageId = useRef(1)
  const visibleMessages: ChatMessage[] = [{ id: 0, role: "ai", text: t.chatbot.greeting }, ...messages]
  const selectedResultMatchesUrl =
    connectedAnalysisResultId && selectedAnalysisResult
      ? getAnalysisResultId(selectedAnalysisResult) === connectedAnalysisResultId
      : true
  const connectedHospitalName = selectedResultMatchesUrl && selectedAnalysisResult
    ? getHistoryHospitalName(selectedAnalysisResult, language)
    : undefined
  const isAnalysisConnected = Boolean(connectedAnalysisResultId || selectedAnalysisResult)
  const currentRecommendedQuestions = isAnalysisConnected
    ? t.chatbot.linkedExamples
    : recommendedQuestions?.questions ?? (messages.length === 0 ? t.chatbot.examples : [])
  const suggestionsExpanded = areSuggestionsOpen
  const inputPlaceholder = isAnalysisConnected ? t.chatbot.linkedPlaceholder : t.chatbot.placeholder
  const contextTitle = connectedHospitalName
    ? t.chatbot.linkedResultTitle.replace("{hospitalName}", connectedHospitalName)
    : t.chatbot.linkedResultFallbackTitle

  function applyServerConversation(conversation: ChatbotConversation) {
    setConversationId(conversation.id)
    setConversationAnalysisResultId(conversation.analysisResultId ?? null)
    const nextMessages = withMessageIds((conversation.messages ?? []).map((message) => ({
      role: message.role === "assistant" ? "ai" : "user",
      text: message.content,
    })))
    setMessages(nextMessages)
    nextMessageId.current = nextMessages.length + 1
    setRecommendedQuestions(null)
    setAreSuggestionsOpen(false)
  }

  useEffect(() => {
    const syncSelectedContext = () => {
      setSelectedAnalysisResult(readSelectedChatbotAnalysisContextForUser(user?.id ?? null))
    }

    syncSelectedContext()
    window.addEventListener(CHATBOT_CONTEXT_EVENT, syncSelectedContext)
    window.addEventListener("storage", syncSelectedContext)
    return () => {
      window.removeEventListener(CHATBOT_CONTEXT_EVENT, syncSelectedContext)
      window.removeEventListener("storage", syncSelectedContext)
    }
  }, [user?.id])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      const from = params.get("from")
      const rawAnalysisResultId = params.get("analysisResultId")
      const numericAnalysisResultId = Number(rawAnalysisResultId)
      setConnectedAnalysisResultId(
        from === "analysis" && Number.isInteger(numericAnalysisResultId) && numericAnalysisResultId > 0
          ? numericAnalysisResultId
          : null
      )
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadServerConversation(id: number) {
      const detail = await getChatbotConversation(id)
      if (cancelled) return
      applyServerConversation(detail.data)
    }

    async function loadHistory() {
      if (isAnalysisConnected) {
        setConversationId(null)
        setConversationAnalysisResultId(null)
        setMessages([])
        setHistoryItems([])
        return
      }

      if (!user) {
        const localMessages = readLocalChatHistory()
        if (!cancelled) {
          const nextMessages = withMessageIds(localMessages)
          setMessages(nextMessages)
          nextMessageId.current = nextMessages.length + 1
          setConversationId(null)
          setConversationAnalysisResultId(null)
          setHistoryItems([])
        }
        return
      }

      try {
        setIsHistoryLoading(true)
        const conversations = await listChatbotConversations(MAX_SERVER_HISTORY_ITEMS)
        if (cancelled) return
        setHistoryItems(conversations.data)
        const latest = conversations.data[0]
        if (!latest) {
          if (!cancelled) {
            setMessages([])
            setConversationId(null)
            setConversationAnalysisResultId(null)
          }
          return
        }
        await loadServerConversation(latest.id)
      } catch {
        if (!cancelled) {
          setMessages([])
          setConversationId(null)
          setConversationAnalysisResultId(null)
          setHistoryItems([])
        }
      } finally {
        if (!cancelled) setIsHistoryLoading(false)
      }
    }

    void loadHistory()

    return () => {
      cancelled = true
    }
  }, [isAnalysisConnected, user])

  async function loadConversation(conversation: ChatbotConversation) {
    if (isResponding || isAnalysisConnected) return
    try {
      setIsHistoryLoading(true)
      const detail = await getChatbotConversation(conversation.id)
      applyServerConversation(detail.data)
    } finally {
      setIsHistoryLoading(false)
    }
  }

  function startNewConversation() {
    if (isResponding) return
    setMessages([])
    setConversationId(null)
    setConversationAnalysisResultId(null)
    setRecommendedQuestions(null)
    setAreSuggestionsOpen(false)
    nextMessageId.current = 1
  }

  useEffect(() => {
    if (!selectedAnalysisResult && !connectedAnalysisResultId) return
    inputRef.current?.focus()
  }, [connectedAnalysisResultId, selectedAnalysisResult])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [messages, isResponding])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isResponding) return
    const userMsg: ChatMessage = { id: nextMessageId.current, role: "user", text: trimmed }
    nextMessageId.current += 1
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsResponding(true)
    setAreSuggestionsOpen(false)

    try {
      const messageLanguage = detectMessageLanguage(trimmed, language)
      const fallbackAnalysisContext = isAnalysisConnected
        ? selectedAnalysisResult ?? buildCurrentChatAnalysisContext()
        : null
      const analysisResultId = isAnalysisConnected
        ? connectedAnalysisResultId ?? (
          fallbackAnalysisContext ? getAnalysisResultId(fallbackAnalysisContext) : null
        )
        : null
      const reusableConversationId =
        user && conversationId && (!analysisResultId || conversationAnalysisResultId === analysisResultId)
          ? conversationId
          : undefined
      const result = await sendChatMessage({
        message: trimmed,
        language: messageLanguage,
        analysisResultId: analysisResultId ?? undefined,
        analysisContext: fallbackAnalysisContext ?? undefined,
        conversationId: reusableConversationId,
      })
      const fullAnswer = result.data.answer ?? ""
      const aiMsg: ChatMessage = { id: nextMessageId.current, role: "ai", text: fullAnswer }
      nextMessageId.current += 1
      setMessages((prev) => [...prev, aiMsg])
      if (result.data.conversationId) {
        setConversationId(result.data.conversationId)
        setConversationAnalysisResultId(analysisResultId ?? null)
        if (user && !isAnalysisConnected) {
          void refreshServerHistory()
        }
      } else if (!user) {
        writeLocalChatHistory([...messages, userMsg, aiMsg])
      }
      setRecommendedQuestions({ language: messageLanguage, questions: result.data.suggested_questions ?? [] })
    } catch {
      const aiMsg: ChatMessage = { id: nextMessageId.current, role: "ai", text: t.chatbot.error }
      nextMessageId.current += 1
      setMessages((prev) => [...prev, aiMsg])
    } finally {
      setIsResponding(false)
    }
  }

  const clearConnectedResult = () => {
    setConnectedAnalysisResultId(null)
    setSelectedAnalysisResult(null)
    setRecommendedQuestions(null)
    setAreSuggestionsOpen(false)
    clearSelectedChatbotAnalysisContext()
    setConversationId(null)
    setConversationAnalysisResultId(null)
    if (connectedAnalysisResultId) {
      router.replace(ROUTES.CHATBOT)
    }
  }

  const contextBanner = isAnalysisConnected ? (
    <div className={styles.chatContextBanner}>
      <div>
        <strong>{contextTitle}</strong>
        <p>{t.chatbot.linkedResultDescription}</p>
      </div>
      <button type="button" className={styles.smallPillButton} onClick={clearConnectedResult}>
        {t.chatbot.clear}
      </button>
    </div>
  ) : null

  const historyBar = user && !isAnalysisConnected ? (
    <div className={styles.chatHistoryBar} aria-label={t.chatbot.historyTitle}>
      <button
        type="button"
        className={styles.chatHistoryNewButton}
        onClick={startNewConversation}
        disabled={isResponding || isHistoryLoading}
      >
        {t.chatbot.newChat}
      </button>
      <div className={styles.chatHistoryList}>
        {historyItems.map((conversation) => (
          <button
            key={conversation.id}
            type="button"
            className={`${styles.chatHistoryButton} ${conversation.id === conversationId ? styles.chatHistoryButtonActive : ""}`}
            onClick={() => loadConversation(conversation)}
            disabled={isResponding || isHistoryLoading}
            title={conversation.title}
          >
            <span>{conversation.title}</span>
          </button>
        ))}
      </div>
    </div>
  ) : null

  async function refreshServerHistory() {
    try {
      const conversations = await listChatbotConversations(MAX_SERVER_HISTORY_ITEMS)
      setHistoryItems(conversations.data)
    } catch {
      // 히스토리 목록 갱신 실패는 답변 표시를 막지 않는다.
    }
  }

  return (
    <div className={styles.chatWindow}>
      {historyBar}
      <div className={styles.messageList}>
        {visibleMessages.map((message) => (
          <ChatBubble key={message.id} role={message.role} text={message.text} />
        ))}
        {isResponding && <ChatBubble role="ai" text={t.chatbot.loading} />}
        <div ref={endRef} />
      </div>

      <RecommendedQuestions
        questions={currentRecommendedQuestions}
        onSelect={send}
        expanded={suggestionsExpanded}
        onToggle={() => setAreSuggestionsOpen((current) => !current)}
      />

      <div className={styles.chatbotSpacer} />

      {dockInput ? (
        <div className={styles.chatInputDock}>
          {contextBanner}
          <ChatInput
            inputRef={inputRef}
            value={input}
            onChange={setInput}
            onSubmit={() => send(input)}
            placeholder={inputPlaceholder}
          />
        </div>
      ) : (
        <>
          {contextBanner}
          <ChatInput
            inputRef={inputRef}
            value={input}
            onChange={setInput}
            onSubmit={() => send(input)}
            placeholder={inputPlaceholder}
          />
        </>
      )}
    </div>
  )
}

function readLocalChatHistory(): StoredLocalChatMessage[] {
  if (typeof window === "undefined") return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_CHAT_HISTORY_KEY) || "[]")
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((message): message is StoredLocalChatMessage =>
        message &&
        (message.role === "ai" || message.role === "user") &&
        typeof message.text === "string"
      )
      .slice(-MAX_LOCAL_CHAT_MESSAGES)
  } catch {
    return []
  }
}

function writeLocalChatHistory(messages: ChatMessage[]) {
  if (typeof window === "undefined") return
  const payload = messages
    .filter((message) => message.id !== 0)
    .map((message) => ({ role: message.role, text: message.text }))
    .slice(-MAX_LOCAL_CHAT_MESSAGES)
  window.localStorage.setItem(LOCAL_CHAT_HISTORY_KEY, JSON.stringify(payload))
}

function withMessageIds(messages: StoredLocalChatMessage[]): ChatMessage[] {
  return messages.map((message, index) => ({
    id: index + 1,
    role: message.role,
    text: message.text,
  }))
}
