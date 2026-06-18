"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { STORAGE_KEYS } from "@/lib/constants";
import { ROUTES } from "@/lib/routes";
import type { LoginRequest, LoginResponse, SignupPayload, User } from "@/lib/types";
import { authService } from "@/services/authService";

interface AuthContextValue {
  user: User | null;
  isLogin: boolean;
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
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, payload.accessToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(payload.user));
    setUser(payload.user);
  }, []);

  const updateUser = useCallback((nextUser: User) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const login = useCallback(async (payload: LoginRequest) => {
    const result = await authService.loginWithEmail(payload.email, payload.password);
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

    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setUser(null);
    router.push(ROUTES.LOGIN);
  }, [router]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
        const savedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

        if (!savedToken) {
          setIsLoading(false);
          return;
        }

        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }

        authService.me().then((result) => {
          setUser(result.data);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(result.data));
        }).catch(() => {
          // 백엔드가 준비되지 않아도 저장된 로그인 정보는 유지합니다.
        });
      } catch {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
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
