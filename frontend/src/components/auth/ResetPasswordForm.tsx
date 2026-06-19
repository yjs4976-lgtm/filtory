"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { ROUTES } from "@/lib/routes";
import { authService } from "@/services/authService";
import styles from "@/styles/App.module.css";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!token) {
      setError(t.auth.resetTokenMissing);
      return;
    }

    if (!password || !passwordConfirm) {
      setError(t.auth.resetPasswordRequired);
      return;
    }

    if (password !== passwordConfirm) {
      setError(t.auth.passwordMismatch);
      return;
    }

    try {
      setIsSubmitting(true);

      await authService.resetPassword({
        token,
        password,
        passwordConfirm,
      });

      alert(t.auth.resetPasswordSuccess);
      router.push(ROUTES.LOGIN);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : t.auth.resetPasswordFailed
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.memberForm} onSubmit={handleSubmit}>
      {error && <p className={styles.formError}>{error}</p>}

      <label className={styles.label}>
        {t.auth.newPassword}
        <input
          className={styles.input}
          type="password"
          placeholder={t.auth.newPasswordPlaceholder}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      <label className={styles.label}>
        {t.auth.newPasswordConfirm}
        <input
          className={styles.input}
          type="password"
          placeholder={t.auth.newPasswordConfirmPlaceholder}
          value={passwordConfirm}
          onChange={(event) => setPasswordConfirm(event.target.value)}
        />
      </label>

      <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
        {isSubmitting ? t.auth.resetPasswordSubmitting : t.auth.resetPasswordButton}
      </button>
    </form>
  );
}
