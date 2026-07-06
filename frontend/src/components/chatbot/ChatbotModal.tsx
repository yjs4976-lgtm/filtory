"use client"

import { useEffect, useRef } from "react"
import { X } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"
import { ChatWindow } from "./ChatWindow"

export function ChatbotModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={`${styles.modalBackdrop} ${styles.chatbotModalBackdrop}`} role="presentation" onMouseDown={onClose}>
      <section className={`${styles.modalCard} ${styles.chatbotModal}`} role="dialog" aria-modal="true" aria-label={t.chatbot.title} onMouseDown={(event) => event.stopPropagation()}>
        <div className={styles.chatbotModalHeader}>
          <h2 className={styles.titleMd}>{t.chatbot.title}</h2>
          <button ref={closeButtonRef} type="button" className={styles.iconButton} aria-label={t.chatbot.close} onClick={onClose}>
            <X className={styles.iconMd} />
          </button>
        </div>
        <ChatWindow />
      </section>
    </div>
  )
}
