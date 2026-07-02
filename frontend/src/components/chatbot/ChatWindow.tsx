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
      const fallbackAnalysisContext = selectedAnalysisResult ?? buildCurrentChatAnalysisContext()
      const result = await sendChatMessage({
        message: trimmed,
        language,
        analysisResultId: connectedAnalysisResultId ?? undefined,
        analysisContext: connectedAnalysisResultId ? undefined : fallbackAnalysisContext,
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

  const clearConnectedResult = () => {
    setConnectedAnalysisResultId(null)
    clearSelectedChatbotAnalysisContext()
    router.replace(ROUTES.CHATBOT)
  }

  const selectedResultMatchesUrl =
    connectedAnalysisResultId && selectedAnalysisResult
      ? getAnalysisResultId(selectedAnalysisResult) === connectedAnalysisResultId
      : true
  const connectedHospitalName = selectedResultMatchesUrl ? selectedAnalysisResult?.hospitalName : undefined
  const isAnalysisConnected = Boolean(connectedAnalysisResultId || selectedAnalysisResult)

  return (
    <div className={styles.chatWindow}>
      {isAnalysisConnected && (
        <div className={styles.chatContextBanner}>
          <div>
            <strong>
              {connectedHospitalName ||
                (language === "ko" ? "분석 결과가 연결됐어요." : "Analysis result connected.")}
            </strong>
            <p>
              {connectedHospitalName
                ? t.chatbot.askingBasedOnResult.replace("{hospitalName}", connectedHospitalName)
                : language === "ko"
                  ? "분석 결과를 바탕으로 질문할 수 있어요."
                  : "You can ask questions based on this analysis result."}
            </p>
          </div>
          <button type="button" className={styles.smallPillButton} onClick={clearConnectedResult}>
            {language === "ko" ? "분석 결과 연결 해제" : "Clear result context"}
          </button>
        </div>
      )}

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
          <ChatInput inputRef={inputRef} value={input} onChange={setInput} onSubmit={() => send(input)} />
        </div>
      ) : (
        <ChatInput inputRef={inputRef} value={input} onChange={setInput} onSubmit={() => send(input)} />
      )}
    </div>
  )
}
