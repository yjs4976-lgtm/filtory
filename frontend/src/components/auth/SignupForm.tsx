"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useLanguage } from "@/context/LanguageContext";
import { ROUTES } from "@/lib/routes";
import type { TermsAgreementState } from "@/lib/types";
import { memberService } from "@/services/memberService";
import { TermsAgreement } from "./TermsAgreement";
import styles from "@/styles/App.module.css";

export function SignupForm() {
  const router = useRouter();
  const { signup } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [nicknameCheck, setNicknameCheck] = useState<"idle" | "available" | "unavailable">("idle");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [terms, setTerms] = useState<TermsAgreementState>({
    termsAgreed: false,
    privacyAgreed: false,
    marketingAgreed: false,
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nicknameValidation = validateSignupId(nickname, t.auth);
  const passwordValidation = validatePassword(password, t.auth);
  const passwordsMatch = password.length > 0 && password === passwordConfirm;
  const canSubmit =
    Boolean(name.trim()) &&
    Boolean(phone.trim()) &&
    Boolean(email.trim()) &&
    terms.termsAgreed &&
    terms.privacyAgreed &&
    nicknameCheck === "available" &&
    nicknameValidation.valid &&
    passwordValidation.valid &&
    passwordsMatch &&
    !isSubmitting;

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!name || !phone || !email || !nickname || !password || !passwordConfirm) {
      setError(t.auth.requiredFields);
      return;
    }

    if (!isValidEmail(email)) {
      setError(t.auth.invalidEmail);
      return;
    }

    if (!nicknameValidation.valid) {
      setError(nicknameValidation.message);
      return;
    }

    if (!passwordValidation.valid) {
      setError(passwordValidation.message);
      return;
    }

    if (password !== passwordConfirm) {
      setError(t.auth.passwordMismatch);
      return;
    }

    if (nicknameCheck !== "available") {
      setError(t.auth.idDuplicateRequired);
      return;
    }

    if (!terms.termsAgreed || !terms.privacyAgreed) {
      setError(t.auth.termsRequired);
      return;
    }

    try {
      setIsSubmitting(true);

      await signup({
        name,
        phone,
        email,
        password,
        nickname,
        termsAgreed: terms.termsAgreed,
        privacyAgreed: terms.privacyAgreed,
        marketingAgreed: terms.marketingAgreed,
      });

      showToast({
        title: t.auth.signupToastTitle,
        description: t.auth.signupToastDescription,
        tone: "success",
      });
      router.push(ROUTES.LOGIN);
    } catch (error) {
      setError(error instanceof Error ? error.message : t.auth.signupFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNicknameCheck = async () => {
    const validation = validateSignupId(nickname, t.auth)
    if (!validation.valid) {
      setError(validation.message);
      return;
    }
    const result = await memberService.checkNicknameDuplicate(nickname)
    setNicknameCheck(result.available ? "available" : "unavailable")
    setError("")
  };

  return (
    <form className={styles.memberForm} onSubmit={handleSubmit}>
      {error && <p className={styles.formError}>{error}</p>}

      <label className={styles.label} htmlFor="signup-name">
        {t.auth.name}
        <input
          id="signup-name"
          className={styles.input}
          type="text"
          placeholder={t.auth.namePlaceholder}
          value={name}
          autoComplete="name"
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <label className={styles.label} htmlFor="signup-phone">
        {t.auth.phone}
        <input
          id="signup-phone"
          className={styles.input}
          type="tel"
          placeholder={t.auth.phonePlaceholder}
          value={phone}
          autoComplete="tel"
          onChange={(event) => setPhone(event.target.value)}
        />
      </label>

      <label className={styles.label} htmlFor="signup-email">
        {t.auth.email}
        <input
          id="signup-email"
          className={styles.input}
          type="email"
          placeholder="example@email.com"
          value={email}
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className={styles.label} htmlFor="signup-nickname">
        {t.auth.id}
        <div className={styles.inlineField}>
          <input
            id="signup-nickname"
            className={styles.input}
            type="text"
            placeholder={t.auth.idPlaceholder}
            value={nickname}
            autoComplete="nickname"
            onChange={(event) => {
              setNickname(event.target.value)
              setNicknameCheck("idle")
            }}
          />
          <button type="button" className={styles.smallPillButton} onClick={handleNicknameCheck}>
            {t.auth.duplicateCheck}
          </button>
        </div>
        {nickname && !nicknameValidation.valid && <span className={styles.formHintError}>{nicknameValidation.message}</span>}
        {nicknameCheck === "available" && <span className={styles.formHintSuccess}>{t.auth.idAvailable}</span>}
        {nicknameCheck === "unavailable" && <span className={styles.formHintError}>{t.auth.idUnavailable}</span>}
      </label>

      <label className={styles.label} htmlFor="signup-password">
        {t.auth.password}
        <input
          id="signup-password"
          className={styles.input}
          type="password"
          placeholder={t.auth.passwordPlaceholder}
          value={password}
          minLength={8}
          autoComplete="new-password"
          onChange={(event) => setPassword(event.target.value)}
        />
        {password && (
          <span className={passwordValidation.valid ? styles.formHintSuccess : styles.formHintError}>
            {passwordValidation.message}
          </span>
        )}
      </label>

      <label className={styles.label} htmlFor="signup-password-confirm">
        {t.auth.passwordConfirm}
        <input
          id="signup-password-confirm"
          className={styles.input}
          type="password"
          placeholder={t.auth.passwordConfirmPlaceholder}
          value={passwordConfirm}
          minLength={8}
          autoComplete="new-password"
          onChange={(event) => setPasswordConfirm(event.target.value)}
        />
        {passwordConfirm && (
          <span className={passwordsMatch ? styles.formHintSuccess : styles.formHintError}>
            {passwordsMatch ? t.auth.passwordMatch : t.auth.passwordMismatch}
          </span>
        )}
      </label>

      <TermsAgreement value={terms} onChange={setTerms} />

      <button className={styles.primaryButton} type="submit" disabled={!canSubmit}>
        {isSubmitting ? t.auth.signupSubmitting : t.auth.signupButton}
      </button>

      <p className={styles.authBottomText}>
        {t.auth.loginPrompt} <Link href={ROUTES.LOGIN}>{t.auth.loginLink}</Link>
      </p>
    </form>
  );
}

function validateSignupId(value: string, messages: Record<string, string>) {
  const trimmed = value.trim();

  if (!trimmed) {
    return { valid: false, message: messages.idRequired };
  }

  if (trimmed !== value || /\s/.test(value)) {
    return { valid: false, message: messages.idNoSpaces };
  }

  if (!/^[A-Za-z0-9_.-]{4,20}$/.test(value)) {
    return { valid: false, message: messages.idInvalid };
  }

  return { valid: true, message: messages.idFormatAvailable };
}

function validatePassword(value: string, messages: Record<string, string>) {
  if (!value) {
    return { valid: false, message: messages.passwordRequired };
  }

  if (value.trim() !== value) {
    return { valid: false, message: messages.passwordNoEdgeSpaces };
  }

  if (value.length < 8) {
    return { valid: false, message: messages.passwordMinLength };
  }

  const groups = [
    /[A-Z]/.test(value),
    /[a-z]/.test(value),
    /\d/.test(value),
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(value),
  ].filter(Boolean).length;

  if (groups < 3) {
    return { valid: false, message: messages.passwordStrength };
  }

  return { valid: true, message: messages.passwordStrong };
}
