import { Bot } from "lucide-react"
import styles from "@/styles/App.module.css"

export function ChatBubble({ role, text }: { role: "ai" | "user"; text: string }) {
  if (role === "ai") {
    return (
      <div className={styles.messageAi}>
        <span className={`${styles.iconBoxRound} ${styles.iconLavender}`}>
          <Bot className={styles.iconSm} />
        </span>
        <div className={styles.bubbleAi}>{text}</div>
      </div>
    )
  }

  return (
    <div className={styles.messageUser}>
      <div className={styles.bubbleUser}>{text}</div>
    </div>
  )
}
