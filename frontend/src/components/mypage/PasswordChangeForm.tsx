"use client"

import { useRef, useState } from "react"
import { Check, ShieldCheck } from "lucide-react"
import { NewPasswordForm, PasswordInput } from "@/components/auth/NewPasswordForm"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/useToast"
import { passwordCopy } from "@/lib/passwordCopy"
import { securityService } from "@/services/securityService"
import styles from "@/styles/App.module.css"

export function PasswordChangeForm() {
  const { language } = useLanguage() as { language: "ko" | "en" }; const c = passwordCopy[language]
  const { user, logout } = useAuth(); const { showToast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [current, setCurrent] = useState(""); const [verified, setVerified] = useState(false)
  const [verifying, setVerifying] = useState(false); const [verifyError, setVerifyError] = useState(""); const [changeError, setChangeError] = useState("")
  const socialOnly = user?.hasPassword === false
  const verify = async (event: React.FormEvent) => { event.preventDefault(); if (!current || verifying) return; setVerifying(true); setVerifyError(""); try { await securityService.verifyPassword(current); setVerified(true) } catch { setVerifyError(c.incorrect); window.setTimeout(() => inputRef.current?.focus(), 0) } finally { setVerifying(false) } }
  const resetVerification = () => { setVerified(false); setCurrent(""); setVerifyError(""); setChangeError(""); window.setTimeout(() => inputRef.current?.focus(), 0) }
  const change = async (password: string, confirmation: string) => { setChangeError(""); try { await securityService.changePassword(current, password, confirmation); showToast({ title: c.changed, tone: "success" }); await logout() } catch (error) { const message = error instanceof Error ? error.message : ""; if (/current password/i.test(message)) { resetVerification(); setVerifyError(c.incorrect) } else if (/policy|security|different/i.test(message)) setChangeError(c.policyError); else setChangeError(c.changeFailed) } }

  if (socialOnly) return <section className={`${styles.card} ${styles.passwordSecurityCard}`}><span className={styles.passwordSocialIcon}><ShieldCheck aria-hidden="true"/></span><div><h2>{c.socialTitle}</h2><p>{c.socialDescription}</p></div></section>

  return <section className={`${styles.card} ${styles.passwordSecurityCard}`}>
    <header><h2>{c.changeTitle}</h2><p>{c.changeDescription}</p></header>
    {!verified ? <form className={styles.passwordVerifyForm} onSubmit={verify}>
      {verifyError && <p id="current-password-error" className={styles.passwordError} role="alert">{verifyError}</p>}
      <PasswordInput ref={inputRef} id="current-password" label={c.current} value={current} onChange={setCurrent} autoComplete="current-password" show={c.show} hide={c.hide} invalid={Boolean(verifyError)} describedBy={verifyError ? "current-password-error" : undefined}/>
      <button className={styles.primaryButton} type="submit" disabled={!current || verifying}>{verifying ? c.verifying : c.verify}</button>
      {verifying && <p className={styles.passwordVerifying} role="status">{c.verifyingDescription}</p>}
    </form> : <div className={styles.passwordChangeStep}>
      <div className={styles.passwordVerified} role="status"><span><Check aria-hidden="true"/>{c.verified}</span><button type="button" onClick={resetVerification}>{c.verifyAgain}</button></div>
      <NewPasswordForm mode="change" currentPassword={current} onSubmit={change} error={changeError} autoFocus/>
    </div>}
  </section>
}
