import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type User = { id: string; name: string } | null;

type AuthContextType = {
  user: User;
  token: string | null;
  signin: (token: string, user: User) => void;
  signout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User>(null);

  // 로컬스토리지에서 복구
  useEffect(() => {
    const t = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    if (t) setToken(t);
    if (u) setUser(JSON.parse(u));
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      signin: (t, u) => {
        setToken(t);
        setUser(u);
        localStorage.setItem("token", t);
        localStorage.setItem("user", JSON.stringify(u));
      },
      signout: () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      },
    }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
