"use client"

import { useEffect, useRef, useState } from "react"
import { useLanguage } from "@/context/LanguageContext"
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

function buildChatAnalysisContext() {
  const analysis = readCurrentReviewAnalysis()

  if (!analysis) return null

  return {
    hospitalName: analysis.hospitalName,
    category: analysis.category,
    trustScore: analysis.trustScore,
    trustGrade: analysis.trustGrade,
    trustLevelKey: analysis.trustLevelKey,
    adSuspicion: analysis.adSuspicion,
    adSuspicionLevel: analysis.adSuspicionLevel,
    detectedPatterns: analysis.detectedPatterns,
    suspiciousPhrases: analysis.suspiciousPhrases,
    repetitivePhrases: analysis.repetitivePhrases,
    informationLevel: analysis.informationLevel,
    summary: analysis.summary,
    recommendation: analysis.recommendation,
    modelVersion: analysis.modelVersion,
    analyzedAt: analysis.analyzedAt,
  }
}

export function ChatWindow() {
  const { t, language } = useLanguage()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isResponding, setIsResponding] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)
  const nextMessageId = useRef(1)
  const visibleMessages: ChatMessage[] = [{ id: 0, role: "ai", text: t.chatbot.greeting }, ...messages]

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [visibleMessages.length])

  async function send(text) {
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
        analysisContext: buildChatAnalysisContext(),
      })
      const aiMsg: ChatMessage = { id: nextMessageId.current, role: "ai", text: result.data.answer }
      nextMessageId.current += 1
      setMessages((prev) => [...prev, aiMsg])
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

      <RecommendedQuestions onSelect={send} />

      <div className={styles.chatbotSpacer} />

      <ChatInput value={input} onChange={setInput} onSubmit={() => send(input)} />
    </div>
  )
}
