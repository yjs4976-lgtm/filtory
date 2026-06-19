"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { ROUTES } from "@/lib/routes";
import { authService } from "@/services/authService";
import styles from "@/styles/App.module.css";

export function FindIdForm() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [foundEmail, setFoundEmail] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setFoundEmail("");

    if (!name || !phone) {
      setError(t.auth.findIdRequired);
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await authService.findId({
        name,
        phone,
      });

      setFoundEmail(result.data.email || t.auth.noMatchingEmail);
    } catch (error) {
      setError(error instanceof Error ? error.message : t.auth.findIdFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.memberForm} onSubmit={handleSubmit}>
      {error && <p className={styles.formError}>{error}</p>}

      {foundEmail && (
        <div className={styles.softCard}>
          <p className={styles.mutedText}>{t.auth.foundEmailLabel}</p>
          <strong>{foundEmail}</strong>
        </div>
      )}

      <label className={styles.label}>
        {t.auth.name}
        <input
          className={styles.input}
          type="text"
          placeholder={t.auth.namePlaceholder}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <label className={styles.label}>
        {t.auth.phone}
        <input
          className={styles.input}
          type="tel"
          placeholder={t.auth.phonePlaceholder}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </label>

      <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
        {isSubmitting ? t.auth.findIdSubmitting : t.auth.findIdButton}
      </button>

      <p className={styles.authBottomText}>
        {t.auth.rememberedPrompt} <Link href={ROUTES.LOGIN}>{t.auth.loginActionLink}</Link>
      </p>
    </form>
  );
}
