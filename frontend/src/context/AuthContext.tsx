"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";
import type { LoginRequest, LoginResponse, SignupPayload, User, Workspace, WorkspacePreference } from "@/lib/types";
import { clearAuthSession, readStoredUser, saveAuthSession, saveStoredUser } from "@/lib/authStorage";
import { clearSelectedChatbotAnalysisContext } from "@/lib/chatbotContext";
import { authService } from "@/services/authService";
import { clearFavoriteHospitalCache, emitFavoriteHospitalChange, getInternalFavoriteHospitalId, isInternalFavoriteHospital, savedHospitalService } from "@/services/savedHospitalService";
import type { HospitalItem } from "@/lib/types";
import { withMockAdminRole } from "@/lib/adminAccess";
import { hasUnsavedWorkspaceChanges, readWorkspaceSettings, writeWorkspaceSettings, type WorkspaceSettings } from "@/lib/workspace";

interface AuthContextValue {
  user: User | null;
  isLogin: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<User>;
  signup: (payload: SignupPayload) => Promise<void>;
  saveLogin: (payload: LoginResponse) => void;
  updateUser: (user: User) => void;
  logout: (redirectTo?: string) => Promise<void>;
  workspaceSettings: WorkspaceSettings;
  setPreferredWorkspace: (value: WorkspacePreference) => void;
  markAdminIntroSeen: (workspace: Workspace, remember: boolean) => void;
  switchWorkspace: (workspace: Workspace) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const initialPathnameRef = useRef(pathname);
  const pendingFavoriteHandledRef = useRef(false);

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings>({ currentWorkspace: "USER", preferredWorkspace: "LAST_USED", lastWorkspace: "USER", hasSeenAdminWorkspaceIntro: false });

  const saveLogin = useCallback((payload: LoginResponse) => {
    if (user?.id !== payload.user.id) {
      clearSelectedChatbotAnalysisContext();
      clearFavoriteHospitalCache();
    }
    const normalized = { ...payload, user: withMockAdminRole(payload.user) };
    saveAuthSession(normalized);
    setUser(normalized.user);
    setWorkspaceSettings(readWorkspaceSettings(normalized.user));
  }, [user?.id]);

  const updateUser = useCallback((nextUser: User) => {
    saveStoredUser(nextUser);
    setUser(nextUser);
  }, []);

  const login = useCallback(async (payload: LoginRequest) => {
    const result = await authService.loginWithIdentifier(payload.identifier, payload.password);
    const normalizedUser = withMockAdminRole(result.data.user);
    saveLogin({ ...result.data, user: normalizedUser });
    return normalizedUser;
  }, [saveLogin]);

  const signup = useCallback(async (payload: SignupPayload) => {
    await authService.signupWithEmail(payload);
  }, []);

  const logout = useCallback(async (redirectTo?: string) => {
    try {
      await authService.logout();
    } catch {
      // 백엔드 로그아웃 실패해도 프론트 로그인 정보는 지워야 함
    }

    clearAuthSession();
    clearSelectedChatbotAnalysisContext();
    clearFavoriteHospitalCache();
    setUser(null);
    router.push(redirectTo ?? ROUTES.LOGIN);
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
          clearFavoriteHospitalCache();
        }
        const normalizedUser = withMockAdminRole(meResult.data);
        saveStoredUser(normalizedUser);
        setUser(normalizedUser);
        setWorkspaceSettings(readWorkspaceSettings(normalizedUser));
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

  useEffect(() => {
    if (!user) {
      pendingFavoriteHandledRef.current = false;
      return;
    }
    if (pendingFavoriteHandledRef.current) return;
    pendingFavoriteHandledRef.current = true;
    const raw = sessionStorage.getItem("pendingFavoriteHospital");
    if (!raw) return;
    try {
      const hospital = JSON.parse(raw) as HospitalItem;
      const save = isInternalFavoriteHospital(hospital)
        ? savedHospitalService.saveHospital(undefined, getInternalFavoriteHospitalId(hospital)!)
        : savedHospitalService.saveExternalHospital(hospital);
      void save.then((saved) => {
        sessionStorage.removeItem("pendingFavoriteHospital");
        emitFavoriteHospitalChange(hospital, true, saved.id);
      }).catch(() => undefined);
    } catch {
      // 잘못된 임시 데이터는 재시도하지 않는다.
      sessionStorage.removeItem("pendingFavoriteHospital");
    }
  }, [user]);

  const persistWorkspace = useCallback((update: (current: WorkspaceSettings) => WorkspaceSettings) => {
    if (!user || user.role !== "ADMIN") return
    setWorkspaceSettings((current) => {
      const next = update(current)
      writeWorkspaceSettings(user, next)
      return next
    })
  }, [user])

  const setPreferredWorkspace = useCallback((preferredWorkspace: WorkspacePreference) => {
    persistWorkspace((current) => ({ ...current, preferredWorkspace }))
  }, [persistWorkspace])

  const markAdminIntroSeen = useCallback((workspace: Workspace, remember: boolean) => {
    persistWorkspace((current) => ({ ...current, currentWorkspace: workspace, lastWorkspace: workspace, preferredWorkspace: remember ? workspace : "LAST_USED", hasSeenAdminWorkspaceIntro: true }))
  }, [persistWorkspace])

  const switchWorkspace = useCallback((workspace: Workspace) => {
    if (!user || (workspace === "ADMIN" && user.role !== "ADMIN")) return false
    if (hasUnsavedWorkspaceChanges() && !window.confirm("저장하지 않은 변경 사항이 있어요.\n\n화면을 전환하면 작성한 내용이 사라질 수 있어요. 계속 전환할까요?")) return false
    persistWorkspace((current) => ({ ...current, currentWorkspace: workspace, lastWorkspace: workspace }))
    router.push(workspace === "ADMIN" ? ROUTES.ADMIN : ROUTES.HOME)
    return true
  }, [persistWorkspace, router, user])

  useEffect(() => {
    if (!user || user.role !== "ADMIN" || isLoading) return
    const workspace: Workspace = pathname.startsWith(ROUTES.ADMIN) ? "ADMIN" : "USER"
    const timer = window.setTimeout(() => persistWorkspace((current) => current.currentWorkspace === workspace && current.lastWorkspace === workspace
      ? current
      : { ...current, currentWorkspace: workspace, lastWorkspace: workspace }), 0)
    return () => window.clearTimeout(timer)
  }, [isLoading, pathname, persistWorkspace, user])

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
      workspaceSettings,
      setPreferredWorkspace,
      markAdminIntroSeen,
      switchWorkspace,
    }),
    [isLoading, login, logout, markAdminIntroSeen, saveLogin, setPreferredWorkspace, signup, switchWorkspace, updateUser, user, workspaceSettings]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
