"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { forgotPassword } from "@/lib/api";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function validateEmail(email: string): string | null {
    if (!email.trim()) return "Email is required";
    if (!EMAIL_REGEX.test(email)) return "Please enter a valid email address";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setSubmitting(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSuccess(true);
    } catch (err) {
      console.error(err);
      // Still show success to prevent email enumeration
      setSuccess(true);
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
          <h1 className="font-display text-2xl font-semibold text-white">Reset your password</h1>
          <p className="mt-2 text-xs text-slate-400">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>

          {success ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-center">
                <div className="mb-2 text-2xl">✉️</div>
                <p className="text-sm font-medium text-emerald-300">Check your email</p>
                <p className="mt-1 text-xs text-slate-400">
                  If an account exists with <span className="text-white">{email}</span>, we&apos;ve sent a password reset link.
                </p>
              </div>
              <p className="text-center text-xs text-slate-500">
                Didn&apos;t receive the email? Check your spam folder or{" "}
                <button
                  type="button"
                  onClick={() => setSuccess(false)}
                  className="font-medium text-lavender-300 hover:text-lavender-200"
                >
                  try again
                </button>
              </p>
            </div>
          ) : (
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
                {submitting ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-slate-500">
            Remember your password?{" "}
            <Link
              href="/auth/sign-in"
              className="font-medium text-lavender-300 hover:text-lavender-200"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
