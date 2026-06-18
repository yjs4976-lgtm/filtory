"use client";

import { SocialLoginButton } from "@/components/auth/SocialLoginButton";
import { authService } from "@/services/authService";

export function GoogleLoginButton() {
  return (
    <SocialLoginButton
      provider="google"
      onClick={() => authService.socialLogin("google")}
    />
  );
}
