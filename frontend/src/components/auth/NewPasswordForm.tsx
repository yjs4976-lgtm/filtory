"use client"

import { forwardRef, useState } from "react"
import { Check, Circle, Eye, EyeOff } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { evaluatePassword, passwordStrength, PASSWORD_POLICY } from "@/lib/passwordPolicy"
import { passwordCopy } from "@/lib/passwordCopy"
import styles from "@/styles/App.module.css"

type Props = { mode: "change" | "reset"; currentPassword?: string; onSubmit: (password: string, confirmation: string) => Promise<void>; error?: string; autoFocus?: boolean }

export function NewPasswordForm({ mode, currentPassword, onSubmit, error, autoFocus }: Props) {
  const { language } = useLanguage() as { language: "ko" | "en" }; const c = passwordCopy[language]
  const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState("")
  const [confirmTouched, setConfirmTouched] = useState(false); const [submitting, setSubmitting] = useState(false)
  const policy = evaluatePassword(password); const strength = passwordStrength(password)
  const matches = confirmation.length > 0 && password === confirmation
  const differs = mode === "reset" || password !== currentPassword
  const canSubmit = policy.valid && matches && differs && !submitting
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!canSubmit) return; setSubmitting(true); try { await onSubmit(password, confirmation) } finally { setSubmitting(false) } }
  const checks = [[policy.minLength, c.min], [policy.hasLetter, c.letter], [policy.hasNumber, c.number], [policy.hasSpecial, c.special], [policy.noWhitespace, c.noSpace]] as const
  return <form className={styles.newPasswordForm} onSubmit={submit}>
    {error && <p className={styles.passwordError} role="alert">{error}</p>}
    <PasswordInput id={`${mode}-new-password`} label={c.newPassword} value={password} onChange={setPassword} autoComplete="new-password" show={c.show} hide={c.hide} maxLength={PASSWORD_POLICY.maxLength} autoFocus={autoFocus}/>
    <div className={styles.passwordStrength} data-strength={strength}><div><span>{c.strength}</span><strong>{c[strength]}</strong></div><span aria-hidden="true"><i/><i/><i/></span></div>
    <ul className={styles.passwordPolicyList}>{checks.map(([met, label]) => <li key={label} data-met={met}>{met ? <Check aria-hidden="true"/> : <Circle aria-hidden="true"/>}{label}</li>)}</ul>
    {!differs && password && <p className={styles.passwordError} role="alert">{c.same}</p>}
    <PasswordInput id={`${mode}-confirm-password`} label={c.confirm} value={confirmation} onChange={setConfirmation} onBlur={() => setConfirmTouched(true)} autoComplete="new-password" show={c.show} hide={c.hide} invalid={confirmTouched && confirmation.length > 0 && !matches} describedBy={`${mode}-match-message`} maxLength={PASSWORD_POLICY.maxLength}/>
    {confirmation && <p id={`${mode}-match-message`} className={matches ? styles.passwordMatch : styles.passwordError} aria-live="polite">{matches ? `✓ ${c.match}` : c.mismatch}</p>}
    <button className={styles.primaryButton} type="submit" disabled={!canSubmit}>{submitting ? (mode === "change" ? c.updating : c.resetting) : (mode === "change" ? c.change : c.reset)}</button>
  </form>
}

type InputProps = { id: string; label: string; value: string; onChange: (value: string) => void; onBlur?: () => void; autoComplete: string; show: string; hide: string; invalid?: boolean; describedBy?: string; maxLength?: number; autoFocus?: boolean }
export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(function PasswordInput({ id, label, value, onChange, onBlur, autoComplete, show, hide, invalid, describedBy, maxLength, autoFocus }, ref) {
  const [visible, setVisible] = useState(false); const labelText = visible ? hide : show; const Icon = visible ? EyeOff : Eye
  return <label className={styles.label} htmlFor={id}>{label}<span className={styles.passwordField}><input ref={ref} id={id} className={styles.input} type={visible ? "text" : "password"} value={value} autoComplete={autoComplete} maxLength={maxLength} autoFocus={autoFocus} aria-invalid={invalid || undefined} aria-describedby={describedBy} onChange={(event) => onChange(event.target.value)} onBlur={onBlur}/><button type="button" className={styles.passwordToggle} aria-label={labelText} title={labelText} onClick={() => setVisible((current) => !current)}><Icon aria-hidden="true"/></button></span></label>
})
