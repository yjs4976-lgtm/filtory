"use client";

import { ChevronDown } from "lucide-react";
import type { TermsAgreementState } from "@/lib/types";
import styles from "@/styles/App.module.css";

interface TermsAgreementProps {
  value: TermsAgreementState;
  onChange: (value: TermsAgreementState) => void;
}

export function TermsAgreement({ value, onChange }: TermsAgreementProps) {
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
          <strong>전체 동의</strong>
          <small>필수와 선택 약관을 한 번에 선택해요.</small>
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
            <strong>서비스 이용약관 동의 <em>필수</em></strong>
            <small>Filtory 분석 서비스 이용 기준에 동의합니다.</small>
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
            <strong>개인정보 수집 및 이용 동의 <em>필수</em></strong>
            <small>계정 생성과 분석 기록 저장을 위한 정보 이용에 동의합니다.</small>
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
            <strong>마케팅 정보 수신 동의 <em className={styles.optionalText}>선택</em></strong>
            <small>새 기능과 유용한 병원 리뷰 분석 팁을 받아볼 수 있어요.</small>
          </span>
          <ChevronDown className={styles.iconXs} aria-hidden />
        </label>
      </div>
    </section>
  );
}
