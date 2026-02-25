"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";

export default function LearnPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050316] text-slate-100">
      {/* Abstract purple glow background, tuned to match main UI */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#050316] via-[#050016] to-[#020617]" />
        <div className="absolute -top-40 right-[-15%] h-[520px] w-[520px] rounded-full bg-lavender-500/30 blur-3xl" />
        <div className="absolute top-1/3 left-[-20%] h-[460px] w-[460px] rounded-full bg-purple-700/25 blur-3xl" />
        <div className="absolute bottom-[-25%] right-1/4 h-[380px] w-[380px] rounded-full bg-lavender-400/15 blur-3xl" />
      </div>

      <Header />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-28 md:px-6 md:pt-32">
        {/* Hero */}
        <section className="grid gap-10 md:grid-cols-[1.2fr,1fr] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-lavender-300">
              Learn · NautiCAI Anomaly Detection
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-white md:text-4xl lg:text-5xl">
              How NautiCAI detects{" "}
              <span className="bg-gradient-to-r from-lavender-300 to-lavender-500 bg-clip-text text-transparent">
                underwater anomalies
              </span>{" "}
              in hulls and pipelines.
            </h1>
            <p className="mt-4 text-sm text-slate-300 md:text-base">
              This console wraps a YOLOv8 model trained on thousands of subsea images. Upload frames or
              video from ROV / AUV missions and get structured detections, mission timelines, and
              publication-ready PDF reports in minutes.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href="/detect"
                className="rounded-lg bg-gradient-to-r from-lavender-600 to-lavender-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lavender-glow transition hover:from-lavender-500 hover:to-lavender-600"
              >
                Open detection console
              </Link>
              <a
                href="https://www.nauticai-ai.com/about"
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-lavender-200 underline-offset-4 hover:underline"
              >
                Learn more about NautiCAI
              </a>
            </div>

            <div className="mt-6 grid gap-4 text-xs text-slate-300 sm:grid-cols-3">
              <div className="rounded-xl border border-dark-border bg-dark-card/80 p-3">
                <p className="font-display text-sm font-semibold text-white">Real mission focus</p>
                <p className="mt-1">
                  Hull plates, anodes, free spans and marine growth on subsea infrastructure — tuned for
                  inspection workflows.
                </p>
              </div>
              <div className="rounded-xl border border-dark-border bg-dark-card/80 p-3">
                <p className="font-display text-sm font-semibold text-white">Detection to report</p>
                <p className="mt-1">
                  Every anomaly snapshot, timeline event and count flows into a structured PDF report.
                </p>
              </div>
              <div className="rounded-xl border border-dark-border bg-dark-card/80 p-3">
                <p className="font-display text-sm font-semibold text-white">Agent layer ready</p>
                <p className="mt-1">
                  The report and anomaly log are designed so an agent can read, summarize and send alerts
                  over channels such as WhatsApp.
                </p>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative overflow-hidden rounded-3xl border border-lavender-500/40 bg-dark-card/70 p-4 shadow-lavender-glow/40 backdrop-blur-xl"
          >
            <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium text-lavender-100">Detection classes</span>
              <span className="rounded-full bg-lavender-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lavender-200">
                YOLOv8 · 7 classes
              </span>
            </div>
            <div className="grid gap-3">
              <div className="relative h-32 overflow-hidden rounded-2xl border border-dark-border/80 bg-black/40">
                <Image
                  src="/anomaly1.jpg"
                  alt="Example detection of marine growth / damage"
                  fill
                  sizes="320px"
                  className="object-cover opacity-95"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 py-2 text-xs text-slate-200">
                  <p className="font-medium">Marine growth &amp; corrosion</p>
                  <p className="text-[11px] text-slate-400">Hull &amp; riser surfaces</p>
                </div>
              </div>
              <div className="relative h-24 overflow-hidden rounded-2xl border border-dark-border/80 bg-black/40">
                <Image
                  src="/anomaly2.jpg"
                  alt="Example detection of free span / debris"
                  fill
                  sizes="320px"
                  className="object-cover opacity-95"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 py-2 text-[11px] text-slate-200">
                  <p className="font-medium">Free span, debris &amp; anomalies</p>
                  <p className="text-[11px] text-slate-400">Pipelines &amp; subsea structures</p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* How it works */}
        <section className="mt-16 space-y-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-semibold text-white">How the console works</h2>
            <p className="mt-3 text-sm text-slate-300">
              The web app separates the trained model from the UI so you can safely iterate on the
              experience. The flow mirrors a real subsea inspection mission.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-dark-border bg-dark-card/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                Step 1
              </p>
              <p className="mt-2 font-display text-lg font-semibold text-white">
                Upload mission data
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Drop single frames, batches of images or ROV/AUV video. Optional underwater simulation lets
                you stress-test the model in murkier conditions.
              </p>
            </div>
            <div className="rounded-2xl border border-dark-border bg-dark-card/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                Step 2
              </p>
              <p className="mt-2 font-display text-lg font-semibold text-white">
                Run YOLOv8 detections
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Each frame is passed to the trained YOLOv8 model. Classes like corrosion, free span, debris,
                marine growth, healthy surface and anodes are logged with confidence scores.
              </p>
            </div>
            <div className="rounded-2xl border border-dark-border bg-dark-card/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                Step 3
              </p>
              <p className="mt-2 font-display text-lg font-semibold text-white">
                Generate mission report
              </p>
              <p className="mt-2 text-sm text-slate-300">
                The anomaly log feeds a PDF generator that creates inspection-ready reports — including
                critical vs warning counts, timelines and snapshot panels.
              </p>
            </div>
          </div>
        </section>

        {/* Sample report */}
        <section className="mt-16 grid gap-8 md:grid-cols-[1.1fr,1fr] md:items-center">
          <div>
            <h2 className="font-display text-2xl font-semibold text-white">
              From detections to PDF mission reports
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              Reports are built with a dedicated PDF engine so they are deterministic and easy to read for
              operators, clients and AI agents. They summarize detections by class, severity and timeline.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>• Overview section capturing mission name, operator, vessel and location.</li>
              <li>• Per-class statistics for corrosion, marine growth, debris, free span and more.</li>
              <li>• Annotated anomaly snapshots that match what you see in the console.</li>
              <li>• Structure that can be parsed by an agent to generate summaries and alerts.</li>
            </ul>
          </div>

          <div className="relative h-64 overflow-hidden rounded-3xl border border-dark-border bg-dark-card/80 shadow-lavender-glow/40">
            <Image
              src="/report.png"
              alt="Sample NautiCAI PDF report preview"
              fill
              sizes="420px"
              className="object-contain p-4"
            />
          </div>
        </section>

        {/* WhatsApp alerts */}
        <section className="mt-16 grid gap-8 md:grid-cols-[1.1fr,1fr] md:items-center">
          <div>
            <h2 className="font-display text-2xl font-semibold text-white">Agent-driven WhatsApp alerts</h2>
            <p className="mt-3 text-sm text-slate-300">
              When a mission finishes with medium or high risk, the agent layer can turn the anomaly log into a
              concise alert and send it over WhatsApp — ideal for operators who are not sitting in front of the
              console.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>• Alerts summarize risk level, vessel, location, and key anomalies.</li>
              <li>• Messages are formatted so they are readable on mobile and in chat threads.</li>
              <li>• You stay aligned with the console view: the agent reads the same timeline and snapshots.</li>
            </ul>
            <p className="mt-4 text-xs text-slate-400">
              To receive sandbox WhatsApp alerts with this prototype, send the message{" "}
              <span className="font-mono text-lavender-200">&quot;join same-variety&quot;</span> to{" "}
              <span className="font-mono text-lavender-200">+14155238886</span> on WhatsApp. You can reply{" "}
              <span className="font-mono text-lavender-200">STOP</span> in the same chat at any time to
              unsubscribe.
            </p>
          </div>

          <div className="relative h-64 overflow-hidden rounded-3xl border border-dark-border bg-dark-card/80 shadow-lavender-glow/40">
            <Image
              src="/wtsappmsg.jpeg"
              alt="Example NautiCAI WhatsApp alert message"
              fill
              sizes="420px"
              className="object-contain p-4"
            />
          </div>
        </section>
      </main>
    </div>
  );
}

