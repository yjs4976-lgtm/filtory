"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Bell,
  ChevronRight,
  KeyRound,
  ShieldCheck,
  Sparkles,
  UserPen,
  UsersRound,
} from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function AccountManageMenu() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const fromPage = searchParams.get("page") ?? "4"
  const withFromPage = (href: string) => `${href}${href.includes("?") ? "&" : "?"}fromPage=${fromPage}`
  const menuGroups = [
    {
      title: t.mypage.menuGroupNotifications,
      items: [
        {
          href: ROUTES.MYPAGE_NOTIFICATIONS,
          label: t.mypage.menu.notifications,
          description: t.mypage.menu.notificationsDesc,
          icon: Bell,
        },
      ],
    },
    {
      title: t.mypage.accountManagement,
      items: [
        { href: ROUTES.MYPAGE_PROFILE, label: t.mypage.menu.profile, description: t.mypage.menu.profileDesc, icon: UserPen },
        { href: `${ROUTES.MYPAGE_SECURITY}?section=password`, label: t.mypage.menu.password, description: t.mypage.menu.passwordDesc, icon: KeyRound },
        { href: `${ROUTES.MYPAGE_SECURITY}?section=social`, label: t.mypage.menu.social, description: t.mypage.menu.socialDesc, icon: UsersRound },
        { href: `${ROUTES.MYPAGE_SECURITY}?section=login`, label: t.mypage.menu.security, description: t.mypage.menu.securityDesc, icon: ShieldCheck },
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
  ]

  return (
    <section className={styles.stackSm}>
      {menuGroups.map((group) => (
        <div key={group.title} className={styles.stackSm}>
          <h2 className={styles.titleSm}>{group.title}</h2>
          <div className={styles.recordList}>
            {group.items.map(({ href, label, description, icon: Icon }) => (
              <Link key={`${group.title}-${label}`} href={withFromPage(href)} className={styles.recordButton}>
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
    </section>
  )
}
