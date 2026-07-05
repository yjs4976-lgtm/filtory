"use client";

import { SocialLoginButton } from "@/components/auth/SocialLoginButton";
import { authService } from "@/services/authService";

export function NaverLoginButton({ nextPath }: { nextPath?: string | null }) {
  return (
    <SocialLoginButton
      provider="naver"
      onClick={() => authService.socialLogin("naver", nextPath)}
    />
  );
}
