"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
          setUser(null);
          return;
        }
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          // eslint-disable-next-line no-console
          console.warn("Supabase getUser error", error.message);
        }
        if (!ignore) {
          setUser(mapSupabaseUser(data?.user ?? null));
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadUser();

    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapSupabaseUser(session?.user ?? null));
    });
    return () => {
      ignore = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp: AuthContextValue["signUp"] = async ({ name, email, phone, password }) => {
    if (!supabase) {
      setUser({
        name: name.trim() || email.split("@")[0] || "Inspector",
        email: email.toLowerCase(),
        phone: phone.trim(),
      });
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
      throw error;
    }
    setUser(mapSupabaseUser(data.user));
  };

  const signIn: AuthContextValue["signIn"] = async ({ email, password }) => {
    if (!supabase) {
      setUser({
        name: email.split("@")[0] || "Inspector",
        email: email.toLowerCase(),
        phone: "",
      });
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });
    if (error) {
      throw error;
    }
    setUser(mapSupabaseUser(data.user));
  };

  const signOut: AuthContextValue["signOut"] = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
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

