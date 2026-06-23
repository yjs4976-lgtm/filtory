"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import type { LoginRequest, LoginResponse, SignupPayload, User } from "@/lib/types";
import { authService } from "@/services/authService";

interface AuthContextValue {
  user: User | null;
  isLogin: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  saveLogin: (payload: LoginResponse) => void;
  updateUser: (user: User) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveLogin = useCallback((payload: LoginResponse) => {
    setUser(payload.user);
  }, []);

  const updateUser = useCallback((nextUser: User) => {
    setUser(nextUser);
  }, []);

  const login = useCallback(async (payload: LoginRequest) => {
    const result = await authService.loginWithIdentifier(payload.identifier, payload.password);
    saveLogin(result.data);
  }, [saveLogin]);

  const signup = useCallback(async (payload: SignupPayload) => {
    await authService.signupWithEmail(payload);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // 백엔드 로그아웃 실패해도 프론트 로그인 정보는 지워야 함
    }

    setUser(null);
    router.push(ROUTES.LOGIN);
  }, [router]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await authService.refresh();
        const meResult = await authService.me();
        setUser(meResult.data);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLogin: !!user,
      isAuthenticated: !!user,
      isAdmin: user?.role === "ADMIN",
      isLoading,
      login,
      signup,
      saveLogin,
      updateUser,
      logout,
    }),
    [isLoading, login, logout, saveLogin, signup, updateUser, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
