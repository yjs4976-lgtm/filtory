"use client"

import { usePathname, useRouter } from "next/navigation"
import { Building2, FileText, Home, MessageCircle, Search, ShieldCheck, UserRound, Users } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/hooks/useAuth"
import { ROUTES } from "@/lib/routes"
import styles from "@/styles/App.module.css"

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLanguage()
  const { isAuthenticated } = useAuth()
  const isAdminRoute = pathname === ROUTES.ADMIN || pathname.startsWith(`${ROUTES.ADMIN}/`)

  const userItems = [
    { href: ROUTES.HOME, label: t.nav.home, icon: Home },
    { href: ROUTES.ANALYZE, label: t.nav.analyze, icon: Search },
    { href: ROUTES.HISTORY, label: t.nav.history, icon: FileText },
    { href: ROUTES.CHATBOT, label: t.nav.chatbot, icon: MessageCircle },
    { href: ROUTES.MYPAGE, label: t.nav.my, icon: UserRound, protected: true },
  ]
  const adminItems = [
    { href: ROUTES.ADMIN, label: t.admin.dashboard, icon: ShieldCheck },
    { href: ROUTES.ADMIN_USERS, label: t.admin.users, icon: Users },
    { href: ROUTES.ADMIN_REVIEWS, label: t.admin.reviews, icon: FileText },
    { href: ROUTES.ADMIN_HOSPITALS, label: t.admin.hospitals, icon: Building2 },
    { href: ROUTES.ADMIN_INQUIRIES, label: t.admin.menuInquiriesTitle, icon: MessageCircle },
  ]
  const items = isAdminRoute ? adminItems : userItems

  return (
    <nav className={styles.bottomNav}>
      <div className={styles.bottomNavInner}>
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === ROUTES.HOME ? pathname === href : pathname.startsWith(href)
          return (
            <button
              key={href}
              type="button"
              className={[styles.bottomNavLink, active ? styles.bottomNavActive : ""].join(" ")}
              onClick={() => router.push(!isAdminRoute && href === ROUTES.MYPAGE && !isAuthenticated ? ROUTES.LOGIN : href)}
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
