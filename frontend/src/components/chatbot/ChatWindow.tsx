"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, Send } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
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
    if (question === examples[1]) return t.chatbot.answers.foreigner
    if (question === examples[2]) return t.chatbot.answers.score
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
        {visibleMessages.map((message) =>
          message.role === "ai" ? (
            <div key={message.id} className={styles.messageAi}>
              <span className={`${styles.iconBoxRound} ${styles.iconLavender}`}>
                <Bot className={styles.iconSm} />
              </span>
              <div className={styles.bubbleAi}>{message.text}</div>
            </div>
          ) : (
            <div key={message.id} className={styles.messageUser}>
              <div className={styles.bubbleUser}>{message.text}</div>
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>

      <div className={styles.exampleList}>
        {t.chatbot.examples.map((question) => (
          <button key={question} type="button" onClick={() => send(question)} className={styles.exampleButton}>
            {question}
          </button>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          send(input)
        }}
        className={styles.chatForm}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t.chatbot.placeholder}
          className={styles.chatInput}
        />
        <button type="submit" aria-label={t.chatbot.send} className={styles.sendButton}>
          <Send className={styles.iconSm} />
        </button>
      </form>
    </div>
  )
}
