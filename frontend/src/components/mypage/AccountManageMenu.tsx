"use client"

import Link from "next/link"
import {
  Bell,
  ChevronRight,
  Database,
  FileText,
  GitCompareArrows,
  HeartPulse,
  KeyRound,
  Settings,
  ShieldCheck,
  Sparkles,
  UserPen,
  UsersRound,
} from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import type { User } from "@/lib/types"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

interface AccountManageMenuProps {
  user: User | null
}

export function AccountManageMenu({ user }: AccountManageMenuProps) {
  const { t } = useLanguage()
  const menuGroups = [
    {
      title: t.mypage.menuGroupActivity,
      items: [
        { href: ROUTES.MYPAGE_HISTORY, label: t.mypage.menu.history, description: t.mypage.menu.historyDesc, icon: FileText },
        { href: ROUTES.MYPAGE_SAVED, label: t.mypage.menu.saved, description: t.mypage.menu.savedDesc, icon: HeartPulse },
        { href: ROUTES.MYPAGE_COMPARE, label: t.mypage.menu.compare, description: t.mypage.menu.compareDesc, icon: GitCompareArrows },
        { href: ROUTES.MYPAGE_RECENT, label: t.mypage.menu.recent, description: t.mypage.menu.recentDesc, icon: FileText },
        { href: ROUTES.MYPAGE_REPORTS, label: t.mypage.menu.reports, description: t.mypage.menu.reportsDesc, icon: ShieldCheck },
      ],
    },
    {
      title: t.mypage.menuGroupNotifications,
      items: [
        {
          href: ROUTES.MYPAGE_NOTIFICATIONS,
          label: t.mypage.menu.notifications,
          description: t.mypage.menu.notificationsDesc,
          icon: Bell,
        },
        {
          href: ROUTES.MYPAGE_SETTINGS,
          label: t.mypage.menu.notificationSettings,
          description: t.mypage.menu.notificationSettingsDesc,
          icon: Settings,
        },
      ],
    },
    {
      title: t.mypage.accountManagement,
      items: [
        { href: ROUTES.MYPAGE_PROFILE, label: t.mypage.menu.profile, description: t.mypage.menu.profileDesc, icon: UserPen },
        { href: ROUTES.MYPAGE_SECURITY, label: t.mypage.menu.password, description: t.mypage.menu.passwordDesc, icon: KeyRound },
        { href: ROUTES.MYPAGE_SECURITY, label: t.mypage.menu.social, description: t.mypage.menu.socialDesc, icon: UsersRound },
        { href: ROUTES.MYPAGE_SECURITY, label: t.mypage.menu.security, description: t.mypage.menu.securityDesc, icon: ShieldCheck },
      ],
    },
    {
      title: t.mypage.menuGroupPersonalization,
      items: [
        { href: ROUTES.MYPAGE_INSIGHTS, label: t.mypage.menu.insights, description: t.mypage.menu.insightsDesc, icon: Sparkles },
        {
          href: ROUTES.CHATBOT,
          label: t.mypage.menu.aiRecommendation,
          description: t.mypage.menu.aiRecommendationDesc,
          icon: Sparkles,
        },
      ],
    },
    {
      title: t.mypage.menuGroupSettings,
      items: [
        {
          href: ROUTES.MYPAGE_SETTINGS,
          label: t.mypage.menu.languageTheme,
          description: t.mypage.menu.languageThemeDesc,
          icon: Settings,
        },
        { href: ROUTES.MYPAGE_DATA, label: t.mypage.menu.data, description: t.mypage.menu.dataDesc, icon: Database },
      ],
    },
  ]
  const providers = [
    { key: "google", label: "Google" },
    { key: "naver", label: "Naver" },
    { key: "kakao", label: "Kakao" },
  ] as const

  return (
    <section className={styles.stackSm}>
      {menuGroups.map((group) => (
        <div key={group.title} className={styles.stackSm}>
          <h2 className={styles.titleSm}>{group.title}</h2>
          <div className={styles.recordList}>
            {group.items.map(({ href, label, description, icon: Icon }) => (
              <Link key={`${group.title}-${label}`} href={href} className={styles.recordButton}>
                <span className={`${styles.iconBoxSmall} ${styles.iconLavender}`}>
                  <Icon className={styles.iconMd} />
                </span>
                <span className={styles.recordBody}>
                  <span className={styles.recordName}>{label}</span>
                  <span className={styles.recordDate}>{description}</span>
                </span>
                <ChevronRight className={styles.iconSm} />
              </Link>
            ))}
          </div>
        </div>
      ))}
      <div className={`${styles.softCard} ${styles.socialProviderGrid}`}>
        {providers.map((provider) => {
          const connected = Boolean(user?.socialProviders?.[provider.key])
          return (
            <span key={provider.key} className={connected ? styles.connectedPill : styles.neutralPill}>
              {provider.label} {connected ? t.mypage.connected : t.mypage.notConnected}
            </span>
          )
        })}
      </div>
    </section>
  )
}
