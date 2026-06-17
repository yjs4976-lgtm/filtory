"use client"

import { useState, useRef, useEffect } from "react"
import { Bot, Send } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

type Message = {
  id: number
  role: "user" | "ai"
  text: string
}

export function ChatWindow() {
  const { t } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const endRef = useRef<HTMLDivElement>(null)
  const nextMessageId = useRef(1)
  const visibleMessages: Message[] = [{ id: 0, role: "ai", text: t.chatbot.greeting }, ...messages]

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [visibleMessages.length])

  function answerFor(question: string): string {
    const examples = t.chatbot.examples
    if (question === examples[0]) return t.chatbot.answers.ad
    if (question === examples[1]) return t.chatbot.answers.foreigner
    if (question === examples[2]) return t.chatbot.answers.score
    return t.chatbot.answers.default
  }

  function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    const userMsg: Message = { id: nextMessageId.current, role: "user", text: trimmed }
    const aiMsg: Message = { id: nextMessageId.current + 1, role: "ai", text: answerFor(trimmed) }
    nextMessageId.current += 2
    setMessages((prev) => [...prev, userMsg, aiMsg])
    setInput("")
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {visibleMessages.map((m) =>
          m.role === "ai" ? (
            <div key={m.id} className="flex items-end gap-2">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </span>
              <div className="max-w-[78%] rounded-2xl rounded-bl-md border border-border bg-card px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-sm">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[78%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground shadow-sm">
                {m.text}
              </div>
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>

      {/* Example questions */}
      <div className="flex flex-wrap gap-2 px-4 pb-2">
        {t.chatbot.examples.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => send(q)}
            className="rounded-full border border-border bg-lavender-soft px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="flex items-center gap-2 border-t border-border bg-subtle px-4 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.chatbot.placeholder}
          className="flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-graypurple focus:border-primary"
        />
        <button
          type="submit"
          aria-label={t.chatbot.send}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
