"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import type { LoginRequest, LoginResponse, SignupPayload, User } from "@/lib/types";
import { clearAuthSession, readStoredUser, saveAuthSession, saveStoredUser } from "@/lib/authStorage";
import { clearSelectedChatbotAnalysisContext } from "@/lib/chatbotContext";
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
  const pathname = usePathname();
  const initialPathnameRef = useRef(pathname);

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveLogin = useCallback((payload: LoginResponse) => {
    if (user?.id !== payload.user.id) {
      clearSelectedChatbotAnalysisContext();
    }
    saveAuthSession(payload);
    setUser(payload.user);
  }, [user?.id]);

  const updateUser = useCallback((nextUser: User) => {
    saveStoredUser(nextUser);
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

    clearAuthSession();
    clearSelectedChatbotAnalysisContext();
    setUser(null);
    router.push(ROUTES.LOGIN);
  }, [router]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = readStoredUser();
        if (initialPathnameRef.current !== ROUTES.AUTH_CALLBACK) {
          try {
            await authService.refresh();
          } catch {
            // refresh가 실패해도 남아 있는 access 쿠키만으로 /me가 통과할 수 있으니 한 번 더 확인한다.
          }
        }
        // 소셜 callback 화면에서는 방금 받은 fresh access 쿠키를 refresh로 덮어쓰지 않는다.
        // 이 fresh 값은 소셜 전용 계정 탈퇴 같은 본인 확인 흐름에서 필요하다.

        const meResult = await authService.me();
        if (storedUser?.id !== meResult.data.id) {
          clearSelectedChatbotAnalysisContext();
        }
        saveStoredUser(meResult.data);
        setUser(meResult.data);
      } catch {
        clearAuthSession();
        clearSelectedChatbotAnalysisContext();
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
