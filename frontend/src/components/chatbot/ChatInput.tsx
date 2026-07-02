"use client"

import type { RefObject } from "react"
import { Send } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function ChatInput({
  value,
  onChange,
  onSubmit,
  inputRef,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  inputRef?: RefObject<HTMLInputElement | null>
}) {
  const { t } = useLanguage()

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className={styles.chatForm}
    >
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t.chatbot.placeholder}
        className={styles.chatInput}
      />
      <button type="submit" aria-label={t.chatbot.send} className={styles.sendButton}>
        <Send className={styles.iconSm} />
      </button>
    </form>
  )
}
