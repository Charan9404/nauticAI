"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

// Validation helpers
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s\-()]{8,20}$/;

type FieldErrors = {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
};

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const next = searchParams.get("next") ?? "/";

  function validateForm(): boolean {
    const errors: FieldErrors = {};

    if (!name.trim()) {
      errors.name = "Name is required";
    } else if (name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!phone.trim()) {
      errors.phone = "Phone number is required for WhatsApp alerts";
    } else if (!PHONE_REGEX.test(phone.replace(/\s/g, ""))) {
      errors.phone = "Please enter a valid phone number (e.g., +65 8XXX XXXX)";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    } else if (password.length > 128) {
      errors.password = "Password is too long";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      });
      // Set first-time user flag for welcome tooltip
      localStorage.setItem("nauticai_first_time", "true");
      router.replace("/"); // Redirect to home to show the tooltip
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
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
                onChange={(e) => {
                  setName(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }}
                className={`w-full rounded-lg border bg-dark-surface px-3 py-2.5 text-sm text-slate-100 outline-none ring-0 transition focus:ring-1 ${
                  fieldErrors.name
                    ? "border-red-500/50 focus:border-red-500 focus:ring-red-500"
                    : "border-dark-border focus:border-lavender-500 focus:ring-lavender-500"
                }`}
                placeholder="ROV Operator"
              />
              {fieldErrors.name && (
                <p className="mt-1 text-[10px] text-red-400">{fieldErrors.name}</p>
              )}
            </div>
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
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                Phone number
              </label>
              <input
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                className={`w-full rounded-lg border bg-dark-surface px-3 py-2.5 text-sm text-slate-100 outline-none ring-0 transition focus:ring-1 ${
                  fieldErrors.phone
                    ? "border-red-500/50 focus:border-red-500 focus:ring-red-500"
                    : "border-dark-border focus:border-lavender-500 focus:ring-lavender-500"
                }`}
                placeholder="+65 8XXX XXXX"
              />
              {fieldErrors.phone ? (
                <p className="mt-1 text-[10px] text-red-400">{fieldErrors.phone}</p>
              ) : (
                <p className="mt-1 text-[10px] text-slate-500">
                  Used for WhatsApp-based inspection alerts and summaries.
                </p>
              )}
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.25em] text-slate-400">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className={`w-full rounded-lg border bg-dark-surface px-3 py-2.5 pr-14 text-sm text-slate-100 outline-none ring-0 transition focus:ring-1 ${
                    fieldErrors.password
                      ? "border-red-500/50 focus:border-red-500 focus:ring-red-500"
                      : "border-dark-border focus:border-lavender-500 focus:ring-lavender-500"
                  }`}
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
              {fieldErrors.password ? (
                <p className="mt-1 text-[10px] text-red-400">{fieldErrors.password}</p>
              ) : password ? (
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
              ) : null}
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

