"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/hooks/useToast";
import { ROUTES } from "@/lib/routes";
import { authService } from "@/services/authService";
import styles from "@/styles/App.module.css";

export function FindIdForm() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [foundId, setFoundId] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCopyId = async () => {
    if (!foundId) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(foundId);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = foundId;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("COPY_FAILED");
      }
      showToast({ title: t.auth.idCopied, tone: "success" });
    } catch {
      showToast({ title: t.auth.copyIdFailed, tone: "info" });
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setFoundId("");

    if (!name.trim() || !phone.trim()) {
      setError(t.auth.findIdRequired);
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await authService.findId({
        name,
        phone,
      });

      setFoundId(result.data.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : t.auth.findIdFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.memberForm} onSubmit={handleSubmit}>
      {error && <p className={styles.formError}>{error}</p>}

      {foundId && (
        <section className={styles.findIdResult} aria-live="polite">
          <div className={styles.findIdResultIntro}>
            <h2>{t.auth.foundIdTitle}</h2>
            <p>{t.auth.foundIdDescription}</p>
          </div>
          <div className={styles.findIdValue}>
            <span>{t.auth.foundIdLabel}</span>
            <strong>{foundId}</strong>
          </div>
          <div className={styles.findIdActions}>
            <button type="button" className={styles.secondaryButton} onClick={handleCopyId}>
              {t.auth.copyId}
            </button>
            <Link href={ROUTES.LOGIN} className={styles.primaryButton}>
              {t.auth.goToSignIn}
            </Link>
          </div>
        </section>
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
          inputMode="tel"
          autoComplete="tel"
          placeholder={t.auth.phonePlaceholder}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </label>

      <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
        {isSubmitting ? t.auth.findIdSubmitting : t.auth.findIdButton}
      </button>

      {!foundId && <p className={styles.authBottomText}>
        {t.auth.rememberedPrompt} <Link href={ROUTES.LOGIN}>{t.auth.loginActionLink}</Link>
      </p>}
    </form>
  );
}
