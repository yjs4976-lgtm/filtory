"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { ROUTES } from "@/lib/routes";
import { authService } from "@/services/authService";
import styles from "@/styles/App.module.css";

export function ForgotPasswordForm() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setDone(false);

    if (!email) {
      setError(t.auth.forgotEmailRequired);
      return;
    }

    try {
      setIsSubmitting(true);

      await authService.forgotPassword({
        email,
      });

      setDone(true);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : t.auth.forgotPasswordFailed
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.memberForm} onSubmit={handleSubmit}>
      {error && <p className={styles.formError}>{error}</p>}

      {done && (
        <div className={styles.softCard}>
          <strong>{t.auth.resetMailSentTitle}</strong>
          <p className={styles.mutedText}>{t.auth.resetMailSentDescription}</p>
        </div>
      )}

      <label className={styles.label}>
        {t.auth.email}
        <input
          className={styles.input}
          type="email"
          placeholder="example@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
        {isSubmitting ? t.auth.forgotPasswordSubmitting : t.auth.forgotPasswordButton}
      </button>

      <p className={styles.authBottomText}>
        <Link href={ROUTES.LOGIN}>{t.auth.backToLogin}</Link>
      </p>
    </form>
  );
}
