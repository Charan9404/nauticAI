"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type User = {
  name: string;
  email: string;
  phone: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (payload: { email: string; password: string }) => Promise<void>;
  signUp: (payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<void>;
  signOut: () => void;
};

const STORAGE_KEY = "nauticai:user";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as User;
        if (parsed && parsed.email) {
          setUser(parsed);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const setAndPersist = (value: User | null) => {
    setUser(value);
    if (typeof window === "undefined") return;
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const signUp: AuthContextValue["signUp"] = async ({
    name,
    email,
    phone,
  }) => {
    const newUser: User = {
      name: name.trim() || email.split("@")[0] || "Inspector",
      email: email.toLowerCase(),
      phone: phone.trim(),
    };
    setAndPersist(newUser);
  };

  const signIn: AuthContextValue["signIn"] = async ({ email }) => {
    const normalizedEmail = email.toLowerCase();
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const existing = JSON.parse(raw) as User;
          if (existing.email === normalizedEmail) {
            setAndPersist(existing);
            return;
          }
        }
      } catch {
        // ignore and fall through
      }
    }

    const fallbackUser: User = {
      name: normalizedEmail.split("@")[0] || "Inspector",
      email: normalizedEmail,
      phone: "",
    };
    setAndPersist(fallbackUser);
  };

  const signOut = () => {
    setAndPersist(null);
  };

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [user, loading],
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

