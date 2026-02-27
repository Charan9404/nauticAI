"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { resetPassword } from "@/lib/api";

// Password validation
function validatePassword(password: string): string | null {
  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";
  if (password.length > 128) return "Password is too long";
  return null;
}

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({
        token,
        password,
        confirm_password: confirmPassword,
      });
      setSuccess(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to reset password. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Password strength indicator
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { level: 0, text: "", color: "" };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { level: 1, text: "Weak", color: "bg-red-500" };
    if (score <= 4) return { level: 2, text: "Medium", color: "bg-amber-500" };
    return { level: 3, text: "Strong", color: "bg-emerald-500" };
  };

  const strength = getPasswordStrength(password);

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
          <h1 className="font-display text-2xl font-semibold text-white">Set new password</h1>
          <p className="mt-2 text-xs text-slate-400">
            Choose a strong password for your account.
          </p>

          {success ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-center">
                <div className="mb-2 text-2xl">✅</div>
                <p className="text-sm font-medium text-emerald-300">Password reset successful!</p>
                <p className="mt-1 text-xs text-slate-400">
                  Your password has been updated. You can now sign in with your new password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/auth/sign-in")}
                className="w-full rounded-lg bg-gradient-to-r from-lavender-600 to-lavender-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lavender-glow transition-all duration-200 hover:from-lavender-500 hover:to-lavender-600 hover:shadow-xl hover:shadow-lavender-500/30"
              >
                Sign in
              </button>
            </div>
          ) : !token ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-center">
                <div className="mb-2 text-2xl">⚠️</div>
                <p className="text-sm font-medium text-red-300">Invalid reset link</p>
                <p className="mt-1 text-xs text-slate-400">
                  This password reset link is invalid or has expired.
                </p>
              </div>
              <Link
                href="/auth/forgot-password"
                className="block w-full rounded-lg bg-gradient-to-r from-lavender-600 to-lavender-700 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lavender-glow transition-all duration-200 hover:from-lavender-500 hover:to-lavender-600 hover:shadow-xl hover:shadow-lavender-500/30"
              >
                Request new reset link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-dark-border bg-dark-surface px-3 py-2.5 pr-10 text-sm text-slate-100 outline-none ring-0 transition focus:border-lavender-500 focus:ring-1 focus:ring-lavender-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {/* Password strength indicator */}
                {password && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-1 gap-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              level <= strength.level ? strength.color : "bg-dark-border"
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`text-[10px] font-medium ${
                        strength.level === 1 ? "text-red-400" :
                        strength.level === 2 ? "text-amber-400" : "text-emerald-400"
                      }`}>
                        {strength.text}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full rounded-lg border bg-dark-surface px-3 py-2.5 text-sm text-slate-100 outline-none ring-0 transition focus:ring-1 ${
                    confirmPassword && confirmPassword !== password
                      ? "border-red-500/50 focus:border-red-500 focus:ring-red-500"
                      : "border-dark-border focus:border-lavender-500 focus:ring-lavender-500"
                  }`}
                  placeholder="••••••••"
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className="mt-1 text-[10px] text-red-400">Passwords do not match</p>
                )}
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !password || password !== confirmPassword}
                className="mt-2 w-full rounded-lg bg-gradient-to-r from-lavender-600 to-lavender-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lavender-glow transition-all duration-200 hover:from-lavender-500 hover:to-lavender-600 hover:shadow-xl hover:shadow-lavender-500/30 disabled:opacity-60"
              >
                {submitting ? "Resetting..." : "Reset password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-dark-bg px-6 py-12 text-xs text-slate-400">
          Loading...
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
