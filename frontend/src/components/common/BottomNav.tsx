"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, Home, MessageCircle, Settings } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import styles from "@/styles/App.module.css"

export function BottomNav() {
  const pathname = usePathname()
  const { t } = useLanguage()

  const items = [
    { href: "/", label: t.nav.home, icon: Home },
    { href: "/result", label: t.nav.history, icon: FileText },
    { href: "/chatbot", label: t.nav.chatbot, icon: MessageCircle },
    { href: "/mypage", label: t.nav.settings, icon: Settings },
  ]

  return (
    <nav className={styles.bottomNav}>
      <div className={styles.bottomNavInner}>
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={[styles.bottomNavLink, active ? styles.bottomNavActive : ""].join(" ")}
            >
              <span className={styles.bottomIcon}>
                <Icon className={styles.iconMd} />
              </span>
              <span className={styles.bottomNavLabel}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
