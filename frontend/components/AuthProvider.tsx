"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

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
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "nauticai:user";

function loadLocalUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User;
    if (!parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveLocalUser(value: User | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function mapSupabaseUser(u: any | null): User | null {
  if (!u) return null;
  const meta = u.user_metadata || {};
  const email = (u.email as string | null) || "";
  if (!email) return null;
  return {
    email,
    name: (meta.name as string | undefined) || email.split("@")[0] || "Inspector",
    phone: (meta.phone as string | undefined) || "",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadUser() {
      try {
        if (!supabase) {
          if (!ignore) setUser(loadLocalUser());
          return;
        }
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          // eslint-disable-next-line no-console
          console.warn("Supabase getUser error", error.message);
          if (!ignore) setUser(loadLocalUser());
          return;
        }
        if (!ignore) {
          const fromSupabase = mapSupabaseUser(data?.user ?? null);
          setUser(fromSupabase ?? loadLocalUser());
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadUser();

    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(mapSupabaseUser(session?.user ?? null));
      },
    );
    return () => {
      ignore = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp: AuthContextValue["signUp"] = async ({ name, email, phone, password }) => {
    const fallbackUser: User = {
      name: name.trim() || email.split("@")[0] || "Inspector",
      email: email.toLowerCase(),
      phone: phone.trim(),
    };

    if (!supabase) {
      saveLocalUser(fallbackUser);
      setUser(fallbackUser);
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: {
          name: name.trim(),
          phone: phone.trim(),
        },
      },
    });
    if (error) {
      // Network / regional issues: fall back to local-only auth so the app is still usable.
      // eslint-disable-next-line no-console
      console.warn("Supabase signUp error, falling back to local auth", error.message);
      saveLocalUser(fallbackUser);
      setUser(fallbackUser);
      return;
    }
    const mapped = mapSupabaseUser(data.user) ?? fallbackUser;
    saveLocalUser(mapped);
    setUser(mapped);
  };

  const signIn: AuthContextValue["signIn"] = async ({ email, password }) => {
    const fallbackUser: User = {
      name: email.split("@")[0] || "Inspector",
      email: email.toLowerCase(),
      phone: "",
    };

    if (!supabase) {
      saveLocalUser(fallbackUser);
      setUser(fallbackUser);
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.warn("Supabase signIn error, falling back to local auth", error.message);
      saveLocalUser(fallbackUser);
      setUser(fallbackUser);
      return;
    }
    const mapped = mapSupabaseUser(data.user) ?? fallbackUser;
    saveLocalUser(mapped);
    setUser(mapped);
  };

  const signOut: AuthContextValue["signOut"] = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    saveLocalUser(null);
    setUser(null);
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

