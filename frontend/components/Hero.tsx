"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

const features = [
  "Real-time hull & pipeline anomaly detection",
  "YOLOv8-powered inspection for ROV & AUV feeds",
  "Professional PDF reports & agent-driven alerts",
];

export function Hero() {
  const { user } = useAuth();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (e: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion(e.matches);
    };
    update(media);
    media.addEventListener("change", update as (e: MediaQueryListEvent) => void);
    return () => {
      media.removeEventListener("change", update as (e: MediaQueryListEvent) => void);
    };
  }, []);
  return (
    <section className="relative flex min-h-[85vh] flex-col justify-center px-4 pt-20 pb-16 sm:min-h-[90vh] sm:px-6 sm:pt-24 sm:pb-20 md:flex-row md:items-center md:gap-16 md:px-12 lg:px-16">
      <div className="relative z-10 min-w-0 flex-1">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-lavender-400 sm:mb-4 sm:text-sm">
            AI Intelligence Layer · Maritime Safety
          </p>
          <h1 className="font-display text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
            Full-Stack Underwater
            <br />
            <span className="bg-gradient-to-r from-lavender-300 via-lavender-400 to-lavender-500 bg-clip-text text-transparent">
              Anomaly Detection
            </span>
          </h1>
          <ul className="mt-8 space-y-3">
            {features.map((feature, i) => (
              <motion.li
                key={feature}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3 text-slate-400"
              >
                <span className="text-lavender-500">→</span>
                <span className="text-sm md:text-base">{feature}</span>
              </motion.li>
            ))}
          </ul>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-8 flex flex-wrap gap-3 sm:mt-10 sm:gap-4"
          >
            <Link
              href={user ? "/detect" : "/auth/sign-up?next=/detect"}
              className="rounded-lg bg-gradient-to-r from-lavender-600 to-lavender-700 px-6 py-3 text-sm font-semibold text-white shadow-lavender-glow transition-all hover:from-lavender-500 hover:to-lavender-600 hover:shadow-lavender-glow-lg"
            >
              {user ? "Open detection console" : "Start for free"}
            </Link>
            <Link
              href="https://www.nauticai-ai.com/contact"
              className="rounded-lg border border-dashed border-slate-500 px-6 py-3 text-sm font-medium text-slate-300 transition-colors hover:border-lavender-500 hover:text-lavender-300"
            >
              Contact us
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Hero visual: glassmorphic video card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="relative hidden flex-1 md:block"
      >
        <div className="relative aspect-square max-w-lg overflow-hidden rounded-2xl">
          {/* Video / poster */}
          {prefersReducedMotion ? (
            <Image
              src="/video1.png"
              alt="ROV / AUV / Pipelines sonar scene"
              fill
              priority
              sizes="(min-width: 1024px) 28rem, 20rem"
              className="object-cover"
            />
          ) : (
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              aria-label="Underwater sonar view for ROV, AUV and pipeline inspection"
              poster="/video1.png"
              className="h-full w-full rounded-2xl object-cover opacity-95"
              style={{
                WebkitMaskImage:
                  "radial-gradient(circle at 50% 50%, black 0%, black 45%, transparent 72%)",
                maskImage:
                  "radial-gradient(circle at 50% 50%, black 0%, black 45%, transparent 72%)",
              }}
            >
              <source src="/video1.mp4" type="video/mp4" />
            </video>
          )}

          {/* Content overlay */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 flex h-full flex-col items-center justify-center gap-4 px-6 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-lavender-400/40 bg-black/40 shadow-[0_0_35px_rgba(129,140,248,0.6)]">
              <span className="text-3xl">🌊</span>
            </div>
            <div>
              <p className="font-display text-sm font-semibold tracking-wide text-lavender-200">
                ROV · AUV · Pipelines
              </p>
              <p className="mt-1 max-w-xs text-xs text-slate-300">
                Upload image or video → AI detection → mission report & smart alerts.
              </p>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[10px]">
              <span className="rounded-full bg-black/50 px-3 py-1 text-slate-200">
                Real-time scanning
              </span>
              <span className="rounded-full bg-black/50 px-3 py-1 text-slate-200">
                YOLOv8 detection
              </span>
              <span className="rounded-full bg-black/50 px-3 py-1 text-slate-200">
                PDF reports
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
