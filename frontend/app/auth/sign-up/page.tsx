"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

function SignUpInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
    if (!phone) {
      setError("Please add a phone number for WhatsApp alerts.");
      return;
    }
    setSubmitting(true);
    try {
      await signUp({ name, email, phone, password });
      router.replace(next);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-bg px-4 py-8 sm:px-6 sm:py-12">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-dark-border bg-dark-card/80 p-5 shadow-lavender-glow backdrop-blur-xl sm:p-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-lavender-400/80">
          NautiCAI Access
        </p>
        <h1 className="font-display text-2xl font-semibold text-white">Create your operator account</h1>
        <p className="mt-2 text-xs text-slate-400">
          Sign up to run missions, generate reports, and receive WhatsApp alerts for critical anomalies.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
              Name
            </label>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-dark-border bg-dark-surface px-3 py-2.5 text-sm text-slate-100 outline-none ring-0 transition focus:border-lavender-500 focus:ring-1 focus:ring-lavender-500"
              placeholder="ROV Operator"
            />
          </div>
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
              Phone number
            </label>
            <input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-dark-border bg-dark-surface px-3 py-2.5 text-sm text-slate-100 outline-none ring-0 transition focus:border-lavender-500 focus:ring-1 focus:ring-lavender-500"
              placeholder="+65 8XXX XXXX"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Used later for WhatsApp-based inspection alerts and summaries.
            </p>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
              Password
            </label>
            <input
              type="password"
              autoComplete="new-password"
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
            {submitting ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link
            href={`/auth/sign-in?next=${encodeURIComponent(next)}`}
            className="font-medium text-lavender-300 hover:text-lavender-200"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-dark-bg px-6 py-12 text-xs text-slate-400">
          Loading sign-up…
        </div>
      }
    >
      <SignUpInner />
    </Suspense>
  );
}

