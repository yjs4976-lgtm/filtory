"use client"

import type { SocialProvider, User } from "@/lib/types"
import { securityService } from "@/services/securityService"
import styles from "@/styles/App.module.css"

interface SocialProviderListProps {
  user: User | null
}

const providers: Array<{ key: SocialProvider; label: string }> = [
  { key: "google", label: "Google" },
  { key: "naver", label: "Naver" },
  { key: "kakao", label: "Kakao" },
]

export function SocialProviderList({ user }: SocialProviderListProps) {
  const handleToggle = async (provider: SocialProvider, connected: boolean) => {
    await securityService.toggleSocialProvider(provider, !connected)
    window.alert("소셜 계정 연결 기능은 백엔드 API 연결 후 실제로 반영됩니다.")
  }

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>연결된 계정</h2>
      {providers.map((provider) => {
        const connected = Boolean(user?.socialProviders?.[provider.key])
        return (
          <div key={provider.key} className={styles.rowBetween}>
            <span>{provider.label}</span>
            <button type="button" className={styles.smallPillButton} onClick={() => handleToggle(provider.key, connected)}>
              {connected ? "연결 해제" : "연결하기"}
            </button>
          </div>
        )
      })}
    </section>
  )
}
