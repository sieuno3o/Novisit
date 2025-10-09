import React, { createContext, useContext, useEffect, useState } from "react";
import { me as apiMe, logout as apiLogout, User } from "./api/auth";
import { tokenStore } from "./api/http";

type AuthState = {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async () => {
    try {
      const u = await apiMe();
      setUser(u);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const hasToken = !!(tokenStore.getAccess() || tokenStore.getRefresh());
      if (hasToken) {
        try {
          await refreshMe();
        } catch {
          /* 무시 */
        }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 초기 1회만

  const logout = async () => {
    await apiLogout(); // 내부에서 토큰 정리
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refreshMe, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
