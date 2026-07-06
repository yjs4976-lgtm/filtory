"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { ROUTES } from "@/lib/routes";
import { authService } from "@/services/authService";
import { PasswordField } from "./PasswordField";
import styles from "@/styles/App.module.css";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const fragmentToken =
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token") || "";
  // 기존에 발송된 query-string 재설정 링크도 만료 전까지는 계속 받을 수 있게 둔다.
  const token = fragmentToken || searchParams.get("token") || "";

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

      <PasswordField
        label={t.auth.newPassword}
        placeholder={t.auth.newPasswordPlaceholder}
        value={password}
        showLabel={t.auth.showPassword}
        hideLabel={t.auth.hidePassword}
        onChange={setPassword}
      />

      <PasswordField
        label={t.auth.newPasswordConfirm}
        placeholder={t.auth.newPasswordConfirmPlaceholder}
        value={passwordConfirm}
        showLabel={t.auth.showPassword}
        hideLabel={t.auth.hidePassword}
        onChange={setPasswordConfirm}
      />

      <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
        {isSubmitting ? t.auth.resetPasswordSubmitting : t.auth.resetPasswordButton}
      </button>
    </form>
  );
}
