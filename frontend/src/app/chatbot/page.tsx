"use client"

import { Bot } from "lucide-react"
import { Header } from "@/components/common/Header"
import { BottomNav } from "@/components/common/BottomNav"
import { ChatWindow } from "@/components/chatbot/ChatWindow"
import { useLanguage } from "@/context/LanguageContext"

export default function ChatbotPage() {
  const { t } = useLanguage()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header title={t.chatbot.title} showBack />

      {/* Character intro */}
      <div className="mx-auto w-full max-w-md px-4 pt-4">
        <div className="flex items-center gap-3 rounded-3xl border border-border bg-lavender-soft p-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Bot className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">Filtory AI</p>
            <p className="text-xs text-graypurple">{t.chatbot.greeting}</p>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col pb-20">
        <ChatWindow />
      </div>

      <BottomNav />
    </div>
  )
}
