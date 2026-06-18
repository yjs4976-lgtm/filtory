"use client";

import { SocialLoginButton } from "@/components/auth/SocialLoginButton";
import { authService } from "@/services/authService";

export function NaverLoginButton() {
  return (
    <SocialLoginButton
      provider="naver"
      onClick={() => authService.socialLogin("naver")}
    />
  );
}
