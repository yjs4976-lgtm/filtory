"use client"

import type { SocialProvider, User } from "@/lib/types"
import { securityService } from "@/services/securityService"
import { useLanguage } from "@/context/LanguageContext"
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
  const { t } = useLanguage()
  const handleToggle = async (provider: SocialProvider, connected: boolean) => {
    await securityService.toggleSocialProvider(provider, !connected)
    window.alert(t.mypage.socialConnectionNotice)
  }

  return (
    <section className={`${styles.card} ${styles.stackSm}`}>
      <h2 className={styles.titleSm}>{t.mypage.connectedAccounts}</h2>
      {providers.map((provider) => {
        const connected = Boolean(user?.socialProviders?.[provider.key])
        return (
          <div key={provider.key} className={styles.rowBetween}>
            <span>{provider.label}</span>
            <button type="button" className={styles.smallPillButton} onClick={() => handleToggle(provider.key, connected)}>
              {connected ? t.mypage.disconnect : t.mypage.connect}
            </button>
          </div>
        )
      })}
    </section>
  )
}
