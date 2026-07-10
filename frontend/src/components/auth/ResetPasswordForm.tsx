"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { NewPasswordForm } from "./NewPasswordForm"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/useToast"
import { passwordCopy } from "@/lib/passwordCopy"
import { ROUTES } from "@/lib/routes"
import { authService } from "@/services/authService"
import styles from "@/styles/App.module.css"

export function ResetPasswordForm() {
  const router = useRouter(); const searchParams = useSearchParams(); const { showToast } = useToast()
  const { language } = useLanguage() as { language: "ko" | "en" }; const c = passwordCopy[language]
  const [token, setToken] = useState(""); const [state, setState] = useState<"checking" | "valid" | "invalid">("checking"); const [error, setError] = useState("")

  useEffect(() => {
    let alive = true
    const fragmentToken = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token") || ""
    const candidate = fragmentToken || searchParams.get("token") || ""
    if (!candidate) { const id = window.setTimeout(() => alive && setState("invalid"), 0); return () => { alive = false; window.clearTimeout(id) } }
    authService.verifyPasswordResetToken(candidate).then(() => { if (!alive) return; setToken(candidate); setState("valid") }).catch(() => { if (alive) setState("invalid") })
    return () => { alive = false }
  }, [searchParams])

  const reset = async (password: string, passwordConfirm: string) => { setError(""); try { await authService.resetPassword({ token, password, passwordConfirm }); showToast({ title: c.resetSuccess, tone: "success" }); router.replace(ROUTES.LOGIN) } catch (error) { const message = error instanceof Error ? error.message : ""; if (/token|expired|invalid/i.test(message)) setState("invalid"); else if (/policy|security|different/i.test(message)) setError(c.policyError); else setError(c.resetFailed) } }
  if (state === "checking") return <p className={styles.passwordResetStatus} role="status">{c.resetVerifying}</p>
  if (state === "invalid") return <section className={styles.passwordInvalidLink} role="alert"><h2>{c.invalidLink}</h2><p>{c.invalidLinkDescription}</p><Link href={ROUTES.FORGOT_PASSWORD} className={styles.primaryButton}>{c.requestLink}</Link></section>
  return <NewPasswordForm mode="reset" onSubmit={reset} error={error} autoFocus/>
}
