"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export function Header() {
  const { user } = useAuth();
  const [logoError, setLogoError] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const pathname = usePathname();
  const onLearnPage = pathname.startsWith("/learn");

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-dark-border/50 bg-dark-bg/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
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
          <Link
            href="/learn"
            className={`relative inline-flex flex-col items-center text-sm font-medium transition-colors ${
              onLearnPage ? "text-lavender-100" : "text-slate-400 hover:text-slate-100"
            }`}
          >
            <span>Learn</span>
            {onLearnPage && (
              <span className="mt-1 h-0.5 w-7 rounded-full bg-gradient-to-r from-lavender-300 via-lavender-500 to-lavender-300" />
            )}
          </Link>

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

        <Link
          href={user ? "/detect" : "/auth/sign-in?next=/detect"}
          className="rounded-lg bg-gradient-to-r from-lavender-600 to-lavender-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lavender-glow transition-all hover:from-lavender-500 hover:to-lavender-600 hover:shadow-lavender-glow-lg"
        >
          {user ? "Go to Dashboard" : "Sign in"}
        </Link>
      </div>
    </motion.header>
  );
}
