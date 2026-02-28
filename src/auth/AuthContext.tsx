import { createContext, useContext, useEffect, useState } from "react";

type User = {
  sub: string;
  email?: string;
  client_id?: string;
  scope?: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (redirectPath?: string) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const API_BASE =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) || "";
const TOKENSMART_URL =
  (import.meta.env.VITE_TOKENSMART_URL as string) ||
  "https://www.tokensmart.co";
const CONNECT_CLIENT_ID =
  (import.meta.env.VITE_CONNECT_CLIENT_ID as string | undefined) || "wip-app";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch(`${API_BASE}/api/auth-me`, {
          credentials: "include",
        });
        if (!res.ok) {
          setUser(null);
        } else {
          const data = await res.json();
          setUser(data.user ?? null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    void fetchMe();
  }, []);

  function login(redirectPath: string = "/") {
    const state = redirectPath;
    const callbackUrl =
      API_BASE !== ""
        ? `${API_BASE}/api/auth-callback`
        : `${window.location.origin}/api/auth-callback`;
    const params = new URLSearchParams({
      client_id: CONNECT_CLIENT_ID,
      redirect_uri: callbackUrl,
      state,
      scope: "profile",
    });
    window.location.href = `${TOKENSMART_URL}/connect?${params.toString()}`;
  }

  async function logout() {
    try {
      await fetch(`${API_BASE}/api/auth-logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      window.location.href = "/";
    }
  }

  const value: AuthContextValue = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

