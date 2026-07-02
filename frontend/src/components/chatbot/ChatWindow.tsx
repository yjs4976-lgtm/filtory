"use client"

import { useEffect, useRef, useState } from "react"
import { useLanguage } from "@/context/LanguageContext"
import {
  CHATBOT_CONTEXT_EVENT,
  buildChatbotContextFromAnalysis,
  clearSelectedChatbotAnalysisContext,
  readSelectedChatbotAnalysisContext,
  type ChatbotAnalysisContext,
} from "@/lib/chatbotContext"
import { readCurrentReviewAnalysis } from "@/lib/analysisStorage"
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

export function ChatWindow() {
  const { t, language } = useLanguage()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [recommendedQuestions, setRecommendedQuestions] = useState<RecommendedQuestionState | null>(null)
  const [selectedAnalysisResult, setSelectedAnalysisResult] = useState<ChatbotAnalysisContext | null>(null)
  const [isResponding, setIsResponding] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const nextMessageId = useRef(1)
  const visibleMessages: ChatMessage[] = [{ id: 0, role: "ai", text: t.chatbot.greeting }, ...messages]
  const visibleRecommendedQuestions =
    recommendedQuestions?.language === language ? recommendedQuestions.questions : []

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
    if (!selectedAnalysisResult) return
    inputRef.current?.focus()
  }, [selectedAnalysisResult])

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
      const result = await sendChatMessage({
        message: trimmed,
        language,
        analysisContext: selectedAnalysisResult ?? buildCurrentChatAnalysisContext(),
      })
      const fullAnswer = result.data.answer ?? ""
      const aiMsg: ChatMessage = { id: nextMessageId.current, role: "ai", text: fullAnswer }
      nextMessageId.current += 1
      setMessages((prev) => [...prev, aiMsg])
      setRecommendedQuestions({ language, questions: result.data.suggested_questions ?? [] })
    } catch {
      const aiMsg: ChatMessage = { id: nextMessageId.current, role: "ai", text: t.chatbot.error }
      nextMessageId.current += 1
      setMessages((prev) => [...prev, aiMsg])
    } finally {
      setIsResponding(false)
    }
  }

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

      {selectedAnalysisResult && (
        <div className={styles.chatContextBanner}>
          <div>
            <strong>{selectedAnalysisResult.hospitalName}</strong>
            <p>
              {t.chatbot.askingBasedOnResult.replace("{hospitalName}", selectedAnalysisResult.hospitalName)}
            </p>
          </div>
          <button type="button" className={styles.smallPillButton} onClick={clearSelectedChatbotAnalysisContext}>
            {t.chatbot.clear}
          </button>
        </div>
      )}

      <div className={styles.chatbotSpacer} />

      <ChatInput inputRef={inputRef} value={input} onChange={setInput} onSubmit={() => send(input)} />
    </div>
  )
}
