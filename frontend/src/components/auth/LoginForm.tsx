"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useLanguage } from "@/context/LanguageContext";
import { sanitizeInternalNextPath } from "@/lib/navigation";
import { ROUTES } from "@/lib/routes";
import { PasswordField } from "./PasswordField";
import styles from "@/styles/App.module.css";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const normalizedIdentifier = identifier.trim();

    if (!normalizedIdentifier || !password) {
      setError(t.auth.loginIdentifierPasswordRequired);
      return;
    }

    try {
      setIsSubmitting(true);
      await login({ identifier: normalizedIdentifier, password });
      showToast({
        title: t.auth.loginToastTitle,
        description: t.auth.loginToastDescription,
        tone: "success",
      });
      const nextPath = sanitizeInternalNextPath(searchParams.get("next"));
      router.push(nextPath ?? ROUTES.MYPAGE);
    } catch (error) {
      setError(error instanceof Error ? error.message : t.auth.loginFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.memberForm} onSubmit={handleSubmit}>
      {error && <p className={styles.formError}>{error}</p>}

      <label className={styles.label} htmlFor="login-identifier">
        {t.auth.loginIdentifier}
        <input
          id="login-identifier"
          className={styles.input}
          type="text"
          placeholder={t.auth.loginIdentifierPlaceholder}
          value={identifier}
          autoComplete="username"
          onChange={(event) => setIdentifier(event.target.value)}
        />
      </label>

      <PasswordField
        id="login-password"
        label={t.auth.password}
        placeholder={t.auth.passwordPlaceholder}
        value={password}
        autoComplete="current-password"
        showLabel={t.auth.showPassword}
        hideLabel={t.auth.hidePassword}
        onChange={setPassword}
      />

      <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
        {isSubmitting ? t.auth.loginSubmitting : t.auth.loginButton}
      </button>

      <div className={styles.authLinks}>
        <Link href={ROUTES.FIND_ID}>{t.auth.findIdLink}</Link>
        <span>|</span>
        <Link href={ROUTES.FORGOT_PASSWORD}>{t.auth.forgotPasswordLink}</Link>
      </div>

      <p className={styles.authBottomText}>
        {t.auth.signupPrompt} <Link href={ROUTES.SIGNUP}>{t.auth.signupButton}</Link>
      </p>
    </form>
  );
}
