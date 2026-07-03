"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import {
  CHATBOT_CONTEXT_EVENT,
  buildChatbotContextFromAnalysis,
  clearSelectedChatbotAnalysisContext,
  getAnalysisResultId,
  readSelectedChatbotAnalysisContext,
  type ChatbotAnalysisContext,
} from "@/lib/chatbotContext"
import { readCurrentReviewAnalysis } from "@/lib/analysisStorage"
import { getHistoryHospitalName } from "@/lib/historyDisplay"
import { ROUTES } from "@/lib/routes"
import { sendChatMessage } from "@/services/chatbotService"
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
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [recommendedQuestions, setRecommendedQuestions] = useState<RecommendedQuestionState | null>(null)
  const [selectedAnalysisResult, setSelectedAnalysisResult] = useState<ChatbotAnalysisContext | null>(null)
  const [connectedAnalysisResultId, setConnectedAnalysisResultId] = useState<number | null>(null)
  const [isResponding, setIsResponding] = useState(false)
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
  const visibleRecommendedQuestions = isAnalysisConnected
    ? t.chatbot.linkedExamples
    : recommendedQuestions?.questions ?? []
  const inputPlaceholder = isAnalysisConnected ? t.chatbot.linkedPlaceholder : t.chatbot.placeholder
  const contextTitle = connectedHospitalName
    ? t.chatbot.linkedResultTitle.replace("{hospitalName}", connectedHospitalName)
    : t.chatbot.linkedResultFallbackTitle

  useEffect(() => {
    const syncSelectedContext = () => {
      setSelectedAnalysisResult(readSelectedChatbotAnalysisContext())
    }

    syncSelectedContext()
    window.addEventListener(CHATBOT_CONTEXT_EVENT, syncSelectedContext)
    window.addEventListener("storage", syncSelectedContext)
    return () => {
      window.removeEventListener(CHATBOT_CONTEXT_EVENT, syncSelectedContext)
      window.removeEventListener("storage", syncSelectedContext)
    }
  }, [])

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

    try {
      const messageLanguage = detectMessageLanguage(trimmed, language)
      const fallbackAnalysisContext = selectedAnalysisResult ?? buildCurrentChatAnalysisContext()
      const analysisResultId = connectedAnalysisResultId ?? (
        fallbackAnalysisContext ? getAnalysisResultId(fallbackAnalysisContext) : null
      )
      const result = await sendChatMessage({
        message: trimmed,
        language: messageLanguage,
        analysisResultId: analysisResultId ?? undefined,
        analysisContext: fallbackAnalysisContext ?? undefined,
      })
      const fullAnswer = result.data.answer ?? ""
      const aiMsg: ChatMessage = { id: nextMessageId.current, role: "ai", text: fullAnswer }
      nextMessageId.current += 1
      setMessages((prev) => [...prev, aiMsg])
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
    clearSelectedChatbotAnalysisContext()
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

  return (
    <div className={styles.chatWindow}>
      <div className={styles.messageList}>
        {visibleMessages.map((message) => (
          <ChatBubble key={message.id} role={message.role} text={message.text} />
        ))}
        {isResponding && <ChatBubble role="ai" text={t.chatbot.loading} />}
        <div ref={endRef} />
      </div>

      <RecommendedQuestions questions={visibleRecommendedQuestions} onSelect={send} />

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
