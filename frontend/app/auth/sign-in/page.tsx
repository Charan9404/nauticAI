"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SignInInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const next = searchParams.get("next") ?? "/";

  function validateForm(): boolean {
    const errors: { email?: string; password?: string } = {};
    
    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = "Please enter a valid email address";
    }
    
    if (!password) {
      errors.password = "Password is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await signIn({ email: email.trim().toLowerCase(), password });
      router.replace(next);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background image */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Image
          src="/bgx.png"
          alt="Background"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-100 brightness-110"
        />
        <div className="absolute inset-0 bg-dark-bg/60" />
      </div>

      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-dark-border bg-dark-card/80 p-5 shadow-lavender-glow backdrop-blur-xl sm:p-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-lavender-400/80">
            NautiCAI Access
          </p>
          <h1 className="font-display text-2xl font-semibold text-white">Sign in to explore the model</h1>
          <p className="mt-2 text-xs text-slate-400">
            Use your inspection operator account to upload missions and generate reports.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                className={`w-full rounded-lg border bg-dark-surface px-3 py-2.5 text-sm text-slate-100 outline-none ring-0 transition focus:ring-1 ${
                  fieldErrors.email
                    ? "border-red-500/50 focus:border-red-500 focus:ring-red-500"
                    : "border-dark-border focus:border-lavender-500 focus:ring-lavender-500"
                }`}
                placeholder="you@fleet.co"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-[10px] text-red-400">{fieldErrors.email}</p>
              )}
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-[10px] font-medium text-lavender-400 hover:text-lavender-300"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                className={`w-full rounded-lg border bg-dark-surface px-3 py-2.5 text-sm text-slate-100 outline-none ring-0 transition focus:ring-1 ${
                  fieldErrors.password
                    ? "border-red-500/50 focus:border-red-500 focus:ring-red-500"
                    : "border-dark-border focus:border-lavender-500 focus:ring-lavender-500"
                }`}
                placeholder="••••••••"
              />
              {fieldErrors.password && (
                <p className="mt-1 text-[10px] text-red-400">{fieldErrors.password}</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-lg bg-gradient-to-r from-lavender-600 to-lavender-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lavender-glow transition-all duration-200 hover:from-lavender-500 hover:to-lavender-600 hover:shadow-xl hover:shadow-lavender-500/30 disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-500">
            New to NautiCAI?{" "}
            <Link
              href={`/auth/sign-up?next=${encodeURIComponent(next)}`}
              className="font-medium text-lavender-300 hover:text-lavender-200"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-dark-bg px-6 py-12 text-xs text-slate-400">
          Loading sign-in…
        </div>
      }
    >
      <SignInInner />
    </Suspense>
  );
}

