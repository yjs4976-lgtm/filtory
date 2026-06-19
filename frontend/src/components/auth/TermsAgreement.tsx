"use client";

import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { TermsAgreementState } from "@/lib/types";
import styles from "@/styles/App.module.css";

interface TermsAgreementProps {
  value: TermsAgreementState;
  onChange: (value: TermsAgreementState) => void;
}

export function TermsAgreement({ value, onChange }: TermsAgreementProps) {
  const { t } = useLanguage();
  const allChecked = value.termsAgreed && value.privacyAgreed && value.marketingAgreed;

  function updateField(field: keyof TermsAgreementState, checked: boolean) {
    onChange({ ...value, [field]: checked });
  }

  function updateAll(checked: boolean) {
    onChange({
      termsAgreed: checked,
      privacyAgreed: checked,
      marketingAgreed: checked,
    });
  }

  return (
    <section className={`${styles.termsCard} ${styles.stackSm}`}>
      <label className={styles.checkRow}>
        <input type="checkbox" checked={allChecked} onChange={(event) => updateAll(event.target.checked)} />
        <span>
          <strong>{t.auth.termsAll}</strong>
          <small>{t.auth.termsAllDesc}</small>
        </span>
      </label>

      <div className={styles.termsList}>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={value.termsAgreed}
            onChange={(event) => updateField("termsAgreed", event.target.checked)}
          />
          <span>
            <strong>{t.auth.termsService} <em>{t.auth.required}</em></strong>
            <small>{t.auth.termsServiceDesc}</small>
          </span>
          <ChevronDown className={styles.iconXs} aria-hidden />
        </label>

        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={value.privacyAgreed}
            onChange={(event) => updateField("privacyAgreed", event.target.checked)}
          />
          <span>
            <strong>{t.auth.termsPrivacy} <em>{t.auth.required}</em></strong>
            <small>{t.auth.termsPrivacyDesc}</small>
          </span>
          <ChevronDown className={styles.iconXs} aria-hidden />
        </label>

        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={value.marketingAgreed}
            onChange={(event) => updateField("marketingAgreed", event.target.checked)}
          />
          <span>
            <strong>{t.auth.termsMarketing} <em className={styles.optionalText}>{t.auth.optional}</em></strong>
            <small>{t.auth.termsMarketingDesc}</small>
          </span>
          <ChevronDown className={styles.iconXs} aria-hidden />
        </label>
      </div>
    </section>
  );
}
