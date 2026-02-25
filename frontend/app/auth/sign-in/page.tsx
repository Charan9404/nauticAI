"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

function SignInInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = searchParams.get("next") ?? "/detect";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    setSubmitting(true);
    try {
      await signIn({ email, password });
      router.replace(next);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-bg px-6 py-12">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-dark-border bg-dark-card/80 p-8 shadow-lavender-glow backdrop-blur-xl">
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
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-dark-border bg-dark-surface px-3 py-2.5 text-sm text-slate-100 outline-none ring-0 transition focus:border-lavender-500 focus:ring-1 focus:ring-lavender-500"
              placeholder="you@fleet.co"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-dark-border bg-dark-surface px-3 py-2.5 text-sm text-slate-100 outline-none ring-0 transition focus:border-lavender-500 focus:ring-1 focus:ring-lavender-500"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-gradient-to-r from-lavender-600 to-lavender-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lavender-glow transition hover:from-lavender-500 hover:to-lavender-600 disabled:opacity-60"
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

