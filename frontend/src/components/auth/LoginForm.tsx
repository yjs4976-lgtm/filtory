"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useLanguage } from "@/context/LanguageContext";
import { ROUTES } from "@/lib/routes";
import styles from "@/styles/App.module.css";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!email || !password) {
      setError(t.auth.emailPasswordRequired);
      return;
    }

    try {
      setIsSubmitting(true);
      await login({ email, password });
      showToast({
        title: t.auth.loginToastTitle,
        description: t.auth.loginToastDescription,
        tone: "success",
      });
      router.push(ROUTES.MYPAGE);
    } catch (error) {
      setError(error instanceof Error ? error.message : t.auth.loginFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.memberForm} onSubmit={handleSubmit}>
      {error && <p className={styles.formError}>{error}</p>}

      <label className={styles.label} htmlFor="login-email">
        {t.auth.email}
        <input
          id="login-email"
          className={styles.input}
          type="email"
          placeholder="example@email.com"
          value={email}
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className={styles.label} htmlFor="login-password">
        {t.auth.password}
        <input
          id="login-password"
          className={styles.input}
          type="password"
          placeholder={t.auth.passwordPlaceholder}
          value={password}
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

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
