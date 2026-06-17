"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, FileText, MessageCircle, Settings } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

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
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-subtle/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 py-1.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 transition-colors"
            >
              <span
                className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-graypurple"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className={`text-[11px] font-medium ${active ? "text-foreground" : "text-graypurple"}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
