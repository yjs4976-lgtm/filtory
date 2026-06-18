"use client"

import { usePathname, useRouter } from "next/navigation"
import { FileText, Home, MessageCircle, Search, UserRound } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLanguage()
  const { isAuthenticated } = useAuth()

  const items = [
    { href: ROUTES.HOME, label: t.nav.home, icon: Home },
    { href: ROUTES.ANALYZE, label: t.nav.analyze, icon: Search },
    { href: ROUTES.HISTORY, label: t.nav.history, icon: FileText },
    { href: ROUTES.CHATBOT, label: t.nav.chatbot, icon: MessageCircle },
    { href: ROUTES.MYPAGE, label: t.nav.my, icon: UserRound, protected: true },
  ]

  return (
    <nav className={styles.bottomNav}>
      <div className={styles.bottomNavInner}>
        {items.map(({ href, label, icon: Icon, protected: protectedRoute }) => {
          const active = href === ROUTES.HOME ? pathname === href : pathname.startsWith(href)
          return (
            <button
              key={href}
              type="button"
              className={[styles.bottomNavLink, active ? styles.bottomNavActive : ""].join(" ")}
              onClick={() => router.push(protectedRoute && !isAuthenticated ? ROUTES.LOGIN : href)}
            >
              <span className={styles.bottomIcon}>
                <Icon className={styles.iconMd} />
              </span>
              <span className={styles.bottomNavLabel}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
