"use client";

import { useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { authService } from "@/services/authService";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setDone(false);

    if (!email) {
      setError("이메일을 입력해주세요.");
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
        error instanceof Error ? error.message : "비밀번호 찾기에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}

      {done && (
        <div className="result-box">
          <strong>재설정 메일을 보냈어요.</strong>
          <p>이메일을 확인한 뒤 비밀번호를 다시 설정해주세요.</p>
        </div>
      )}

      <label className="form-label">
        이메일
        <input
          className="form-input"
          type="email"
          placeholder="가입한 이메일을 입력해주세요"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "전송 중..." : "비밀번호 재설정 메일 받기"}
      </button>

      <p className="auth-bottom-text">
        <Link href={ROUTES.LOGIN}>로그인으로 돌아가기</Link>
      </p>
    </form>
  );
}