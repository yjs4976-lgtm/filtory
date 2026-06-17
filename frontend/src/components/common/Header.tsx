"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bell, ShieldCheck } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { LanguageToggle } from "./LanguageToggle"

type HeaderProps = {
  title?: string
  showBack?: boolean
  showBrand?: boolean
  showBell?: boolean
}

export function Header({ title, showBack = false, showBrand = false, showBell = false }: HeaderProps) {
  const router = useRouter()
  const { t } = useLanguage()

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-subtle/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 items-center gap-2">
          {showBack && (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={t.common.back}
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-lavender-soft"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          {showBrand ? (
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold tracking-tight text-foreground">{t.appName}</span>
            </Link>
          ) : (
            <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          {showBell && (
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-lavender-soft"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-pink" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
