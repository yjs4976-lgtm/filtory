"use client"

import { useEffect, useRef, useState } from "react"
import { useLanguage } from "@/context/LanguageContext"
import { ChatBubble } from "./ChatBubble"
import { ChatInput } from "./ChatInput"
import { RecommendedQuestions } from "./RecommendedQuestions"
import styles from "@/styles/App.module.css"

export function ChatWindow() {
  const { t } = useLanguage()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const endRef = useRef(null)
  const nextMessageId = useRef(1)
  const visibleMessages = [{ id: 0, role: "ai", text: t.chatbot.greeting }, ...messages]

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [visibleMessages.length])

  function answerFor(question) {
    const examples = t.chatbot.examples
    if (question === examples[0]) return t.chatbot.answers.ad
    if (question === examples[1]) return t.chatbot.answers.score
    if (question === examples[2]) return t.chatbot.answers.foreigner
    return t.chatbot.answers.default
  }

  function send(text) {
    const trimmed = text.trim()
    if (!trimmed) return
    const userMsg = { id: nextMessageId.current, role: "user", text: trimmed }
    const aiMsg = { id: nextMessageId.current + 1, role: "ai", text: answerFor(trimmed) }
    nextMessageId.current += 2
    setMessages((prev) => [...prev, userMsg, aiMsg])
    setInput("")
  }

  return (
    <div className={styles.chatWindow}>
      <div className={styles.messageList}>
        {visibleMessages.map((message) => (
          <ChatBubble key={message.id} role={message.role} text={message.text} />
        ))}
        <div ref={endRef} />
      </div>

      <RecommendedQuestions onSelect={send} />

      <ChatInput value={input} onChange={setInput} onSubmit={() => send(input)} />
    </div>
  )
}
