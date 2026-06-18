"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import { authService } from "@/services/authService";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("비밀번호 재설정 토큰이 없습니다.");
      return;
    }

    if (!password || !passwordConfirm) {
      setError("새 비밀번호를 입력해주세요.");
      return;
    }

    if (password !== passwordConfirm) {
      setError("비밀번호가 서로 다릅니다.");
      return;
    }

    try {
      setIsSubmitting(true);

      await authService.resetPassword({
        token,
        password,
        passwordConfirm,
      });

      alert("비밀번호가 변경되었습니다. 다시 로그인해주세요.");
      router.push(ROUTES.LOGIN);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "비밀번호 재설정에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}

      <label className="form-label">
        새 비밀번호
        <input
          className="form-input"
          type="password"
          placeholder="새 비밀번호를 입력해주세요"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      <label className="form-label">
        새 비밀번호 확인
        <input
          className="form-input"
          type="password"
          placeholder="새 비밀번호를 다시 입력해주세요"
          value={passwordConfirm}
          onChange={(event) => setPasswordConfirm(event.target.value)}
        />
      </label>

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "변경 중..." : "비밀번호 재설정"}
      </button>
    </form>
  );
}