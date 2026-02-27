"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

export function Header() {
  const { user, signOut } = useAuth();
  const [logoError, setLogoError] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [showFirstTimeTooltip, setShowFirstTimeTooltip] = useState(false);
  const pathname = usePathname();
  const onLearnPage = pathname.startsWith("/learn");

  // Check for first-time user flag (set after signup)
  useEffect(() => {
    const isFirstTime = localStorage.getItem("nauticai_first_time");
    if (isFirstTime === "true" && pathname === "/") {
      // Small delay for smoother animation after page load
      const timer = setTimeout(() => setShowFirstTimeTooltip(true), 800);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  const dismissFirstTimeTooltip = () => {
    setShowFirstTimeTooltip(false);
    localStorage.removeItem("nauticai_first_time");
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-dark-border/50 bg-dark-bg/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-14 min-h-14 max-w-7xl flex-wrap items-center justify-between gap-2 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {logoError ? (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-lavender-500 to-lavender-700 shadow-lg shadow-lavender-glow">
                <span className="font-display text-sm font-bold text-white">N</span>
              </div>
              <span className="font-display text-lg font-semibold tracking-tight text-white">
                NautiCAI
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative h-8 w-8">
                <Image
                  src="/logo.webp"
                  alt="NautiCAI logo"
                  fill
                  className="object-contain"
                  sizes="32px"
                  priority
                  onError={() => setLogoError(true)}
                />
              </div>
              <span className="font-display text-lg font-semibold tracking-tight text-white">
                NautiCAI
              </span>
            </div>
          )}
        </Link>

        {/* Mobile: compact nav links */}
        <nav className="flex items-center gap-3 sm:gap-4 md:hidden">
          <Link href="/learn" className="text-xs font-medium text-slate-400 hover:text-lavender-200">Learn</Link>
          <Link href="https://www.nauticai-ai.com/about" target="_blank" rel="noreferrer" className="text-xs font-medium text-slate-400 hover:text-lavender-200">About</Link>
        </nav>
        <nav className="relative hidden items-center gap-8 md:flex">
          {/* Product with Tenderly-style dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setProductOpen(true)}
            onMouseLeave={() => setProductOpen(false)}
          >
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-slate-400 transition-colors hover:text-slate-100"
            >
              <span>Product</span>
              <span className="text-xs text-slate-500 transition-transform duration-150">
                ▾
              </span>
            </button>

            <AnimatePresence>
              {productOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="absolute left-0 top-full z-40 mt-3 w-[520px] rounded-2xl border border-dark-border bg-dark-card/95 p-4 shadow-2xl backdrop-blur-xl"
                >
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        AI Intelligence Layer
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        Real-time anomaly detection for hulls, pipelines and subsea assets.
                      </p>
                    </div>
                    <span className="rounded-full bg-lavender-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-lavender-200">
                      ROV · AUV · Pipelines
                    </span>
                  </div>

                  <Link
                    href={user ? "/detect" : "/auth/sign-in?next=/detect"}
                    className="group flex w-full items-center gap-4 rounded-xl border border-dark-border bg-gradient-to-r from-lavender-600/10 via-lavender-600/5 to-transparent p-4 text-left hover:border-lavender-500/60 hover:bg-lavender-600/15"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lavender-600/20 text-lavender-200 shadow-lavender-glow">
                      <span className="text-lg">🌊</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-display text-sm font-semibold text-white">
                        NautiCAI Underwater Anomaly Detection
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Upload hull or pipeline footage → YOLOv8 detections → mission report and alerts.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-400">
                        <span className="rounded-full bg-dark-surface/80 px-2 py-0.5">
                          YOLOv8 · 7 classes
                        </span>
                        <span className="rounded-full bg-dark-surface/80 px-2 py-0.5">
                          PDF mission reports
                        </span>
                        <span className="rounded-full bg-dark-surface/80 px-2 py-0.5">
                          Agentic insights
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-lavender-300 group-hover:translate-x-0.5 group-hover:text-lavender-100">
                      {user ? "Open console →" : "Sign in to try →"}
                    </span>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Learn */}
          <div className="relative">
            <Link
              href="/learn"
              onClick={() => {
                if (showFirstTimeTooltip) dismissFirstTimeTooltip();
              }}
              className={`relative inline-flex flex-col items-center text-sm font-medium transition-colors ${
                onLearnPage ? "text-lavender-100" : "text-slate-400 hover:text-slate-100"
              }`}
            >
              <span>Learn</span>
              {onLearnPage && (
                <span className="mt-1 h-0.5 w-7 rounded-full bg-gradient-to-r from-lavender-300 via-lavender-500 to-lavender-300" />
              )}
            </Link>

            {/* First-time user tooltip */}
            <AnimatePresence>
              {showFirstTimeTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="absolute top-full left-0 z-50 mt-3 w-64"
                  style={{ marginLeft: "calc(-128px + 50%)" }}
                >
                  {/* Arrow pointing up - positioned at center of Learn text */}
                  <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-lavender-500/60 bg-dark-card" />
                  
                  <div className="relative w-full rounded-xl border border-lavender-500/60 bg-dark-card/95 p-4 shadow-2xl shadow-lavender-500/20 backdrop-blur-xl">
                    {/* Close button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissFirstTimeTooltip();
                      }}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-700/50 hover:text-slate-300"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    {/* Pulsing indicator */}
                    <div className="mb-3 flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lavender-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-lavender-500" />
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-lavender-400">
                        New to NautiCAI?
                      </span>
                    </div>

                    <p className="pr-4 text-sm font-medium text-white">
                      Learn how to setup and run the model
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Quick guide to get started with underwater anomaly detection.
                    </p>

                    <Link
                      href="/learn"
                      onClick={dismissFirstTimeTooltip}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-lavender-600 to-lavender-700 px-3 py-2 text-xs font-semibold text-white shadow-lg transition-all hover:from-lavender-500 hover:to-lavender-600"
                    >
                      <span>Get Started</span>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* About (external) */}
          <Link
            href="https://www.nauticai-ai.com/about"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-100"
          >
            About
          </Link>
        </nav>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          {user && (
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-lavender-500 hover:text-lavender-100 sm:px-4 sm:py-2.5"
            >
              Sign out
            </button>
          )}
          <Link
            href={user ? "/detect" : "/auth/sign-in?next=/detect"}
            className="rounded-lg bg-gradient-to-r from-lavender-600 to-lavender-700 px-4 py-2 text-xs font-semibold text-white shadow-lavender-glow transition-all hover:from-lavender-500 hover:to-lavender-600 hover:shadow-lavender-glow-lg sm:px-5 sm:py-2.5 sm:text-sm"
          >
            {user ? "Dashboard" : "Sign in"}
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
