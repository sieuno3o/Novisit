import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { me as apiMe, logout as apiLogout, User } from "./api/auth";
import { tokenStore, hardLogout } from "./api/http";
import { disablePushForCurrentUser } from "./firebase/fcmClient";


type AuthState = {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  isAuthenticated: boolean;

  setUser: (u: User | null) => void;
  refreshMe: () => Promise<void>;
  loginFromTokens: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    tokenStore.getAccess() || null
  );
  const [loading, setLoading] = useState(true);
  const lastRefreshRef = useRef<number>(0);

  const syncAccessToken = () => {
    setAccessToken(tokenStore.getAccess() || null);
  };

  const refreshMe = async () => {
    try {
      const u = await apiMe();
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      syncAccessToken();
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const hasToken = !!(tokenStore.getAccess() || tokenStore.getRefresh());
      syncAccessToken();
      if (hasToken) {
        try {
          await refreshMe();
        } catch {
          /* 무시 */
        }
      }
      setLoading(false);
    })();

    // 탭 전환/스토리지 변경 시 토큰 및 사용자 정보 갱신
    const onStorage = () => syncAccessToken();
    const onFocus = async () => {
      syncAccessToken();

      // 30초 쿨다운 - 과도한 API 호출 방지
      const now = Date.now();
      if (now - lastRefreshRef.current < 30000) return;

      lastRefreshRef.current = now;

      // user 정보 갱신 (토큰이 있을 때만)
      if (tokenStore.getAccess()) {
        try {
          await refreshMe();
        } catch (err) {
          // 조용히 실패 처리 (에러 무시)
        }
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []); // 초기 1회만

  const loginFromTokens = async () => {
    // 소셜/일반 로그인에서 tokenStore에 토큰 저장 후 호출
    setLoading(true);
    try {
      await refreshMe();
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await disablePushForCurrentUser(); // 홍우민추가: 로그아웃시 push notifications 비활성화
      await apiLogout(); // 내부에서 tokenStore 정리한다고 가정
    } finally {
      setUser(null);
      syncAccessToken(); // 혹시 모를 잔여 토큰 동기화
    }
  };

  const isAuthenticated = !!accessToken; // 토큰 존재 기준

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        accessToken,
        isAuthenticated,
        setUser,
        refreshMe,
        loginFromTokens,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
