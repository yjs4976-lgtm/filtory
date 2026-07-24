"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { useLanguage } from "@/context/LanguageContext";
import { ROUTES } from "@/lib/routes";
import type { Gender, TermsAgreementState } from "@/lib/types";
import { normalizeOptionalDate } from "@/lib/profileDemographics";
import { memberService } from "@/services/memberService";
import { PasswordField } from "./PasswordField";
import { TermsAgreement } from "./TermsAgreement";
import styles from "@/styles/App.module.css";
import { evaluatePassword } from "@/lib/passwordPolicy";
import { sanitizeAuthRedirectPath } from "@/lib/navigation";

const EMAIL_DOMAINS = [
  "gmail.com",
  "naver.com",
  "kakao.com",
  "daum.net",
  "hanmail.net",
  "outlook.com",
  "icloud.com",
];
const CUSTOM_EMAIL_DOMAIN = "custom";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [emailLocalPart, setEmailLocalPart] = useState("");
  const [emailDomain, setEmailDomain] = useState(EMAIL_DOMAINS[0]);
  const [customEmailDomain, setCustomEmailDomain] = useState("");
  const [isEmailDomainModalOpen, setIsEmailDomainModalOpen] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [loginIdCheck, setLoginIdCheck] = useState<"idle" | "available" | "unavailable">("idle");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [terms, setTerms] = useState<TermsAgreementState>({
    termsAgreed: false,
    privacyAgreed: false,
    marketingAgreed: false,
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const loginNextPath = sanitizeAuthRedirectPath(
    searchParams.get("redirect") ?? searchParams.get("next")
  );
  const loginHref = loginNextPath
    ? `${ROUTES.LOGIN}?next=${encodeURIComponent(loginNextPath)}`
    : ROUTES.LOGIN;
  const loginIdValidation = validateLoginId(loginId, t.auth);
  const passwordValidation = validatePassword(password, t.auth);
  const passwordsMatch = password.length > 0 && password === passwordConfirm;
  const selectedEmailDomain = emailDomain === CUSTOM_EMAIL_DOMAIN ? customEmailDomain : emailDomain;
  const email = emailLocalPart.trim() && selectedEmailDomain.trim()
    ? `${emailLocalPart.trim()}@${selectedEmailDomain.trim()}`
    : "";
  const canSubmit =
    Boolean(name.trim()) &&
    Boolean(phone.trim()) &&
    Boolean(email.trim()) &&
    terms.termsAgreed &&
    terms.privacyAgreed &&
    loginIdCheck === "available" &&
    loginIdValidation.valid &&
    passwordValidation.valid &&
    passwordsMatch &&
    !isSubmitting;
  const todayDate = formatLocalDate(new Date());

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedLoginId = loginId.trim().toLowerCase();

    if (!trimmedName || !trimmedPhone || !normalizedEmail || !normalizedLoginId || !password || !passwordConfirm) {
      setError(t.auth.requiredFields);
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError(t.auth.invalidEmail);
      return;
    }

    if (!loginIdValidation.valid) {
      setError(loginIdValidation.message);
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

    if (loginIdCheck !== "available") {
      setError(t.auth.idDuplicateRequired);
      return;
    }

    if (!terms.termsAgreed || !terms.privacyAgreed) {
      setError(t.auth.termsRequired);
      return;
    }
    if (dateOfBirth && !normalizeOptionalDate(dateOfBirth)) {
      setError(t.auth.invalidDateOfBirth);
      return;
    }

    try {
      setIsSubmitting(true);

      await signup({
        name: trimmedName,
        phone: trimmedPhone,
        email: normalizedEmail,
        password,
        loginId: normalizedLoginId,
        termsAgreed: terms.termsAgreed,
        privacyAgreed: terms.privacyAgreed,
        marketingAgreed: terms.marketingAgreed,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
      });

      showToast({
        title: t.auth.signupToastTitle,
        description: t.auth.signupToastDescription,
        tone: "success",
      });
      const nextPath = sanitizeAuthRedirectPath(searchParams.get("redirect") ?? searchParams.get("next"));
      router.replace(nextPath
        ? `${ROUTES.LOGIN}?next=${encodeURIComponent(nextPath)}`
        : ROUTES.LOGIN
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : t.auth.signupFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailDomainSelect = (domain: string) => {
    setEmailDomain(domain);
    setIsEmailDomainModalOpen(false);
  };

  const handleLoginIdCheck = async () => {
    const validation = validateLoginId(loginId, t.auth)
    if (!validation.valid) {
      setError(validation.message);
      return;
    }
    const result = await memberService.checkLoginIdDuplicate(loginId)
    setLoginIdCheck(result.available ? "available" : "unavailable")
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

      <label className={styles.label} htmlFor="signup-email-local">
        {t.auth.email}
        <div className={styles.emailBuilder}>
          <input
            id="signup-email-local"
            className={styles.input}
            type="text"
            placeholder="example"
            value={emailLocalPart}
            autoComplete="username"
            onChange={(event) => setEmailLocalPart(event.target.value.replace(/\s/g, "").toLowerCase())}
          />
          <span className={styles.emailAt}>@</span>
          {emailDomain === CUSTOM_EMAIL_DOMAIN ? (
            <input
              className={styles.input}
              type="text"
              placeholder="domain.com"
              value={customEmailDomain}
              autoComplete="off"
              onChange={(event) => setCustomEmailDomain(event.target.value.replace(/\s/g, "").toLowerCase())}
            />
          ) : (
            <button
              type="button"
              className={styles.emailDomainButton}
              onClick={() => setIsEmailDomainModalOpen(true)}
            >
              {selectedEmailDomain}
            </button>
          )}
          {emailDomain === CUSTOM_EMAIL_DOMAIN && (
            <button
              type="button"
              className={styles.smallPillButton}
              onClick={() => setIsEmailDomainModalOpen(true)}
            >
              {t.auth.emailDomainList}
            </button>
          )}
        </div>
      </label>

      <label className={styles.label} htmlFor="signup-login-id">
        {t.auth.id}
        <div className={styles.inlineField}>
          <input
            id="signup-login-id"
            className={styles.input}
            type="text"
            placeholder={t.auth.idPlaceholder}
            value={loginId}
            autoComplete="username"
            onChange={(event) => {
              setLoginId(event.target.value.toLowerCase())
              setLoginIdCheck("idle")
            }}
          />
          <button type="button" className={styles.smallPillButton} onClick={handleLoginIdCheck}>
            {t.auth.duplicateCheck}
          </button>
        </div>
        {loginId && !loginIdValidation.valid && <span className={styles.formHintError}>{loginIdValidation.message}</span>}
        {loginIdCheck === "available" && <span className={styles.formHintSuccess}>{t.auth.idAvailable}</span>}
        {loginIdCheck === "unavailable" && <span className={styles.formHintError}>{t.auth.idUnavailable}</span>}
      </label>

      <div className={styles.label}>
        <PasswordField
          id="signup-password"
          label={t.auth.password}
          placeholder={t.auth.passwordPlaceholder}
          value={password}
          minLength={8}
          autoComplete="new-password"
          showLabel={t.auth.showPassword}
          hideLabel={t.auth.hidePassword}
          onChange={setPassword}
        />
        {password && (
          <span className={passwordValidation.valid ? styles.formHintSuccess : styles.formHintError}>
            {passwordValidation.message}
          </span>
        )}
      </div>

      <div className={styles.label}>
        <PasswordField
          id="signup-password-confirm"
          label={t.auth.passwordConfirm}
          placeholder={t.auth.passwordConfirmPlaceholder}
          value={passwordConfirm}
          minLength={8}
          autoComplete="new-password"
          showLabel={t.auth.showPassword}
          hideLabel={t.auth.hidePassword}
          onChange={setPasswordConfirm}
        />
        {passwordConfirm && (
          <span className={passwordsMatch ? styles.formHintSuccess : styles.formHintError}>
            {passwordsMatch ? t.auth.passwordMatch : t.auth.passwordMismatch}
          </span>
        )}
      </div>

      <section className={styles.optionalInfoSection} aria-describedby="signup-optional-description">
        <div><h2>{t.auth.optionalInfo}</h2><span>{t.auth.optional}</span></div>
        <p id="signup-optional-description">{t.auth.optionalInfoDescription}</p>
        <div className={styles.optionalInfoGrid}>
          <label className={styles.label} htmlFor="signup-date-of-birth">
            <span>{t.auth.dateOfBirth} <em>{t.auth.optional}</em></span>
            <input id="signup-date-of-birth" className={styles.input} type="date" max={todayDate} value={dateOfBirth} onChange={(event)=>setDateOfBirth(event.target.value)} aria-describedby="signup-optional-description" />
          </label>
          <label className={styles.label} htmlFor="signup-gender">
            <span>{t.auth.gender} <em>{t.auth.optional}</em></span>
            <select id="signup-gender" className={styles.input} value={gender} onChange={(event)=>setGender(event.target.value as Gender | "")} aria-describedby="signup-optional-description">
              <option value="">{t.auth.genderNotSelected}</option><option value="FEMALE">{t.auth.genderFemale}</option><option value="MALE">{t.auth.genderMale}</option><option value="OTHER">{t.auth.genderOther}</option><option value="PREFER_NOT_TO_SAY">{t.auth.genderPreferNotToSay}</option>
            </select>
          </label>
        </div>
      </section>

      <TermsAgreement value={terms} onChange={setTerms} />

      <button className={styles.primaryButton} type="submit" disabled={!canSubmit}>
        {isSubmitting ? t.auth.signupSubmitting : t.auth.signupButton}
      </button>

      <p className={styles.authBottomText}>
        {t.auth.loginPrompt} <Link href={loginHref}>{t.auth.loginLink}</Link>
      </p>

      {isEmailDomainModalOpen && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={() => setIsEmailDomainModalOpen(false)}
        >
          <section
            className={`${styles.modalCard} ${styles.emailDomainModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-domain-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.emailDomainModalHeader}>
              <h2 id="email-domain-title" className={styles.titleSm}>
                {t.auth.emailDomainTitle}
              </h2>
              <button
                type="button"
                className={styles.smallPillButton}
                onClick={() => setIsEmailDomainModalOpen(false)}
              >
                {t.common.close}
              </button>
            </div>
            <div className={styles.emailDomainGrid}>
              {EMAIL_DOMAINS.map((domain) => (
                <button
                  key={domain}
                  type="button"
                  className={`${styles.emailDomainOption} ${emailDomain === domain ? styles.emailDomainOptionSelected : ""}`}
                  onClick={() => handleEmailDomainSelect(domain)}
                >
                  {domain}
                </button>
              ))}
              <button
                type="button"
                className={`${styles.emailDomainOption} ${emailDomain === CUSTOM_EMAIL_DOMAIN ? styles.emailDomainOptionSelected : ""}`}
                onClick={() => handleEmailDomainSelect(CUSTOM_EMAIL_DOMAIN)}
              >
                {t.auth.emailDomainCustom}
              </button>
            </div>
          </section>
        </div>
      )}
    </form>
  );
}

function formatLocalDate(date: Date) {
  const year=date.getFullYear(); const month=String(date.getMonth()+1).padStart(2,"0"); const day=String(date.getDate()).padStart(2,"0")
  return `${year}-${month}-${day}`
}

function validateLoginId(value: string, messages: Record<string, string>) {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return { valid: false, message: messages.idRequired };
  }

  if (trimmed !== value || /\s/.test(value)) {
    return { valid: false, message: messages.idNoSpaces };
  }

  if (!/^[a-z0-9_.-]{4,20}$/.test(trimmed)) {
    return { valid: false, message: messages.idInvalid };
  }

  return { valid: true, message: messages.idFormatAvailable };
}

function validatePassword(value: string, messages: Record<string, string>) {
  if (!value) {
    return { valid: false, message: messages.passwordRequired };
  }

  const policy = evaluatePassword(value);
  if (!policy.noWhitespace) {
    return { valid: false, message: messages.passwordNoEdgeSpaces };
  }

  if (!policy.minLength || !policy.withinMax) {
    return { valid: false, message: messages.passwordMinLength };
  }

  if (!policy.hasLetter || !policy.hasNumber || !policy.hasSpecial) {
    return { valid: false, message: messages.passwordStrength };
  }

  return { valid: true, message: messages.passwordStrong };
}
