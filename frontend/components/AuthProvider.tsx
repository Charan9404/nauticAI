"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchCurrentUser, loginUser, registerUser, type UserProfile } from "@/lib/api";

type User = UserProfile;

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (payload: { email: string; password: string }) => Promise<void>;
  signUp: (payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "nauticai:auth";

function loadStoredAuth(): { user: User | null; token: string | null } {
  if (typeof window === "undefined") return { user: null, token: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, token: null };
    const parsed = JSON.parse(raw) as { user?: User; token?: string };
    if (!parsed?.user || !parsed?.token) return { user: null, token: null };
    return { user: parsed.user, token: parsed.token };
  } catch {
    return { user: null, token: null };
  }
}

function saveStoredAuth(value: { user: User | null; token: string | null }) {
  if (typeof window === "undefined") return;
  try {
    if (value.user && value.token) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setAuth = (nextUser: User | null, nextToken: string | null) => {
    setUser(nextUser);
    setToken(nextToken);
    saveStoredAuth({ user: nextUser, token: nextToken });
  };

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      const stored = loadStoredAuth();
      if (stored.user && stored.token) {
        setUser(stored.user);
        setToken(stored.token);
        try {
          const refreshed = await fetchCurrentUser(stored.token);
          if (active) {
            setAuth(refreshed, stored.token);
          }
        } catch {
          if (active) {
            setAuth(null, null);
          }
        }
      }
      if (active) setLoading(false);
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const signUp: AuthContextValue["signUp"] = async ({ name, email, phone, password }) => {
    const res = await registerUser({ name, email, phone, password });
    setAuth(res.user, res.access_token);
  };

  const signIn: AuthContextValue["signIn"] = async ({ email, password }) => {
    const res = await loginUser({ email, password });
    setAuth(res.user, res.access_token);
  };

  const signOut: AuthContextValue["signOut"] = async () => {
    setAuth(null, null);
  };

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      token,
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

