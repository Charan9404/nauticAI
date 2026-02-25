"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import {
  detectImage,
  detectVideo,
  generateReport,
  runAgentMission,
  type AnomalyLogItem,
  type Summary,
  type AgentMissionResponse,
} from "@/lib/api";

const SEVERITY: Record<string, { label: string; color: string; bg: string }> = {
  corrosion: { label: "CRITICAL", color: "text-red-400", bg: "border-red-500/50 bg-red-500/10" },
  damage: { label: "CRITICAL", color: "text-red-400", bg: "border-red-500/50 bg-red-500/10" },
  free_span: { label: "CRITICAL", color: "text-red-400", bg: "border-red-500/50 bg-red-500/10" },
  marine_growth: { label: "WARNING", color: "text-amber-400", bg: "border-amber-500/50 bg-amber-500/10" },
  debris: { label: "WARNING", color: "text-amber-400", bg: "border-amber-500/50 bg-amber-500/10" },
  healthy: { label: "NORMAL", color: "text-emerald-400", bg: "border-emerald-500/50 bg-emerald-500/10" },
  anode: { label: "NORMAL", color: "text-emerald-400", bg: "border-emerald-500/50 bg-emerald-500/10" },
};

const ICONS: Record<string, string> = {
  corrosion: "⚠️",
  damage: "🔧",
  free_span: "🔴",
  marine_growth: "🌿",
  debris: "🗑️",
  healthy: "✅",
  anode: "🔋",
};

const defaultSeverity = { label: "WARNING", color: "text-amber-400", bg: "border-amber-500/50 bg-amber-500/10" };
const defaultIcon = "🔍";

function getSeverity(cls: string) {
  return SEVERITY[cls] ?? defaultSeverity;
}
function getIcon(cls: string) {
  return ICONS[cls] ?? defaultIcon;
}

function computeStatsFromLog(
  log: AnomalyLogItem[]
): { detCounts: Record<string, number>; summary: Summary } {
  const detCounts: Record<string, number> = {};
  for (const item of log) {
    detCounts[item.class_name] = (detCounts[item.class_name] ?? 0) + 1;
  }
  let critical = 0,
    warnings = 0,
    normal = 0;
  for (const item of log) {
    const label = getSeverity(item.class_name).label;
    if (label === "CRITICAL") critical++;
    else if (label === "WARNING") warnings++;
    else normal++;
  }
  return {
    detCounts,
    summary: { total: log.length, critical, warnings, normal },
  };
}

type TabId = "image" | "video" | "report";

export default function DetectPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<TabId>("image");
  const [anomalyLog, setAnomalyLog] = useState<AnomalyLogItem[]>([]);
  const [detCounts, setDetCounts] = useState<Record<string, number>>({});
  const [summary, setSummary] = useState<Summary>({ total: 0, critical: 0, warnings: 0, normal: 0 });
  const [annotatedImages, setAnnotatedImages] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [confidence, setConfidence] = useState(0.25);
  const [simulateUnderwater, setSimulateUnderwater] = useState(false);
  const [turbidity, setTurbidity] = useState<"low" | "medium" | "high">("medium");
  const [marineSnow, setMarineSnow] = useState(true);
  const [frameSkip, setFrameSkip] = useState(5);
  const [maxFrames, setMaxFrames] = useState(0);

  const [missionName, setMissionName] = useState("Subsea Inspection Mission");
  const [operatorName, setOperatorName] = useState("NautiCAI Operator");
  const [vesselId, setVesselId] = useState("ROV-NautiCAI-01");
  const [location, setLocation] = useState("Offshore Location");

  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [agentResult, setAgentResult] = useState<AgentMissionResponse | null>(null);
  const [imageModalSrc, setImageModalSrc] = useState<string | null>(null);
  const [imageModalCaption, setImageModalCaption] = useState<string>("");
  const [imageModalZoom, setImageModalZoom] = useState(1);

  useEffect(() => {
    if (user?.name) setOperatorName((prev) => (prev === "NautiCAI Operator" ? user.name : prev));
  }, [user?.name]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/auth/sign-in?next=${encodeURIComponent("/detect")}`);
    }
  }, [authLoading, user, router]);

  const mergeResults = useCallback(
    (newLog: AnomalyLogItem[], newCounts: Record<string, number>, newSummary: Summary) => {
      setAnomalyLog((prev) => [...prev, ...newLog]);
      setDetCounts((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(newCounts)) {
          next[k] = (next[k] ?? 0) + v;
        }
        return next;
      });
      setSummary((prev) => ({
        total: prev.total + newSummary.total,
        critical: prev.critical + newSummary.critical,
        warnings: prev.warnings + newSummary.warnings,
        normal: prev.normal + newSummary.normal,
      }));
    },
    []
  );

  const runSingleImageDetection = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    form.append("confidence", String(confidence));
    form.append("simulate_underwater", String(simulateUnderwater));
    form.append("turbidity", turbidity);
    form.append("marine_snow", String(marineSnow));
    const data = await detectImage(form);
    setAnnotatedImages((prev) => {
      const next = [...prev, data.annotated_image_base64];
      setActiveImageIndex(next.length - 1);
      return next;
    });
    mergeResults(data.anomaly_log, data.det_counts, data.summary);
    return data;
  };

  const triggerAgentAlert = useCallback(
    (payload: {
      anomaly_log: AnomalyLogItem[];
      det_counts: Record<string, number>;
      summary: Summary;
    }) => {
      if (payload.anomaly_log.length === 0) return;
      const normalizedPhone = user?.phone?.replace(/\s/g, "") ?? "";
      runAgentMission({
        anomaly_log: payload.anomaly_log,
        det_counts: payload.det_counts,
        summary: payload.summary,
        mission_name: missionName,
        operator_name: operatorName,
        vessel_id: vesselId,
        location,
        phone: normalizedPhone || undefined,
        send_whatsapp: Boolean(normalizedPhone),
      })
        .then((res) => {
          setAgentResult(res);
          setTab("report");
        })
        .catch(() => {});
    },
    [user?.phone, missionName, operatorName, vesselId, location]
  );

  const runImageDetection = async (file: File) => {
    // Start a fresh mission session for this run
    setAnomalyLog([]);
    setDetCounts({});
    setSummary({ total: 0, critical: 0, warnings: 0, normal: 0 });
    setAnnotatedImages([]);
    setActiveImageIndex(0);
    setAgentResult(null);
    setError(null);
    setLoading(true);
    setLoadingProgress(null);
    try {
      const data = await runSingleImageDetection(file);
      setTab("image");
      const mergedLog = [...anomalyLog, ...data.anomaly_log];
      const mergedCounts = { ...detCounts };
      for (const [k, v] of Object.entries(data.det_counts)) {
        mergedCounts[k] = (mergedCounts[k] ?? 0) + v;
      }
      const mergedSummary = {
        total: summary.total + data.summary.total,
        critical: summary.critical + data.summary.critical,
        warnings: summary.warnings + data.summary.warnings,
        normal: summary.normal + data.summary.normal,
      };
      triggerAgentAlert({ anomaly_log: mergedLog, det_counts: mergedCounts, summary: mergedSummary });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Detection failed");
    } finally {
      setLoading(false);
      setLoadingProgress(null);
    }
  };

  const runImageDetectionBatch = async (files: File[]) => {
    if (files.length === 0) return;
    // Fresh mission session for this batch run
    setAnomalyLog([]);
    setDetCounts({});
    setSummary({ total: 0, critical: 0, warnings: 0, normal: 0 });
    setAnnotatedImages([]);
    setActiveImageIndex(0);
    setAgentResult(null);
    setError(null);
    setLoading(true);
    let accumulatedLog: AnomalyLogItem[] = [];
    let accumulatedCounts: Record<string, number> = {};
    let accumulatedSummary: Summary = { total: 0, critical: 0, warnings: 0, normal: 0 };
    try {
      for (let i = 0; i < files.length; i++) {
        setLoadingProgress(`Processing image ${i + 1} of ${files.length}`);
        const data = await runSingleImageDetection(files[i]);
        accumulatedLog = [...accumulatedLog, ...data.anomaly_log];
        for (const [k, v] of Object.entries(data.det_counts)) {
          accumulatedCounts[k] = (accumulatedCounts[k] ?? 0) + v;
        }
        accumulatedSummary = {
          total: accumulatedSummary.total + data.summary.total,
          critical: accumulatedSummary.critical + data.summary.critical,
          warnings: accumulatedSummary.warnings + data.summary.warnings,
          normal: accumulatedSummary.normal + data.summary.normal,
        };
      }
      setTab("image");
      triggerAgentAlert({
        anomaly_log: accumulatedLog,
        det_counts: accumulatedCounts,
        summary: accumulatedSummary,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Detection failed");
    } finally {
      setLoading(false);
      setLoadingProgress(null);
    }
  };

  const runVideoAnalysis = async (file: File) => {
    // Fresh mission session for this video run
    setAnomalyLog([]);
    setDetCounts({});
    setSummary({ total: 0, critical: 0, warnings: 0, normal: 0 });
    setAnnotatedImages([]);
    setActiveImageIndex(0);
    setAgentResult(null);
    setError(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("confidence", String(confidence));
      form.append("simulate_underwater", String(simulateUnderwater));
      form.append("turbidity", turbidity);
      form.append("marine_snow", String(marineSnow));
      form.append("frame_skip", String(frameSkip));
      form.append("max_frames", String(maxFrames));
      const data = await detectVideo(form);
      setAnnotatedImages([]);
      setActiveImageIndex(0);
      mergeResults(data.anomaly_log, data.det_counts, data.summary);
      setTab("report");
      const mergedLog = [...anomalyLog, ...data.anomaly_log];
      const mergedCounts = { ...detCounts };
      for (const [k, v] of Object.entries(data.det_counts)) {
        mergedCounts[k] = (mergedCounts[k] ?? 0) + v;
      }
      const mergedSummary = {
        total: summary.total + data.summary.total,
        critical: summary.critical + data.summary.critical,
        warnings: summary.warnings + data.summary.warnings,
        normal: summary.normal + data.summary.normal,
      };
      triggerAgentAlert({ anomaly_log: mergedLog, det_counts: mergedCounts, summary: mergedSummary });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Video analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (anomalyLog.length === 0) {
      setError("Run detection on an image or video first.");
      return;
    }
    setError(null);
    setReportLoading(true);
    try {
      const blob = await generateReport({
        anomaly_log: anomalyLog,
        mission_name: missionName,
        operator_name: operatorName,
        vessel_id: vesselId,
        location,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nauticai_${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report generation failed");
    } finally {
      setReportLoading(false);
    }
  };

  const resetSession = () => {
    setAnomalyLog([]);
    setDetCounts({});
    setSummary({ total: 0, critical: 0, warnings: 0, normal: 0 });
    setAnnotatedImages([]);
    setActiveImageIndex(0);
    setAgentResult(null);
    setError(null);
  };

  const removeAnomalyAtIndex = (index: number) => {
    const next = anomalyLog.filter((_, i) => i !== index);
    setAnomalyLog(next);
    const { detCounts: newCounts, summary: newSummary } = computeStatsFromLog(next);
    setDetCounts(newCounts);
    setSummary(newSummary);
  };

  const openImageModal = (src: string, caption: string) => {
    setImageModalSrc(src);
    setImageModalCaption(caption);
    setImageModalZoom(1);
  };

  const closeImageModal = () => {
    setImageModalSrc(null);
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-bg">
        <p className="text-sm text-slate-400">Checking access to the model…</p>
      </div>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "image", label: "Image Detection" },
    { id: "video", label: "Video Analysis" },
    { id: "report", label: "Mission Report" },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Background image just for detection console */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Image
          src="/bgx.png"
          alt="Detection console background"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-100 brightness-110"
        />
        <div className="absolute inset-0 bg-dark-bg/40" />
      </div>

      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-dark-border/50 bg-dark-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs font-medium uppercase tracking-widest text-slate-500 transition hover:text-lavender-400"
            >
              ← Home
            </Link>
            <span className="font-display text-sm font-semibold text-white">
              NautiCAI Detection Console
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Signed in as {user.email}</span>
            <button
              type="button"
              onClick={() => {
                signOut();
                router.push("/");
              }}
              className="rounded-lg border border-dark-border px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-lavender-500/50 hover:text-lavender-300"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto flex max-w-7xl gap-1 px-4 md:px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-t-lg border border-b-0 px-5 py-3 text-xs font-semibold uppercase tracking-wider transition ${
                tab === t.id
                  ? "border-lavender-500/50 bg-dark-card/80 text-lavender-200 shadow-sm"
                  : "border-transparent text-slate-500 hover:bg-dark-card/40 hover:text-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {/* Mission summary strip — always visible */}
        <section className="mb-8 grid gap-4 sm:grid-cols-4">
          <MetricCard label="Total detections" value={summary.total} accent="white" />
          <MetricCard label="Critical" value={summary.critical} accent="red" />
          <MetricCard label="Warnings" value={summary.warnings} accent="amber" />
          <MetricCard label="Healthy / anode" value={summary.normal} accent="emerald" />
        </section>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {/* ── Image tab ───────────────────────────────────────────────── */}
          {tab === "image" && (
            <motion.div
              key="image"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-8"
            >
              <section className="rounded-2xl border border-dark-border bg-dark-card/70 p-6 shadow-lavender-glow/30 backdrop-blur-md">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-white">
                      Upload & run detection
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Drop a hull, pipeline or subsea frame. YOLOv8 returns detections with confidence and severity.
                    </p>
                  </div>
                  <span className="rounded-full border border-lavender-500/40 bg-lavender-500/10 px-3 py-1.5 text-xs font-medium text-lavender-200">
                    YOLOv8 · 7 classes
                  </span>
                </div>

                <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                          Confidence
                        </span>
                        <input
                          type="range"
                          min="0.1"
                          max="0.9"
                          step="0.05"
                          value={confidence}
                          onChange={(e) => setConfidence(Number(e.target.value))}
                          className="w-full accent-lavender-500"
                        />
                        <span className="mt-1 block text-xs text-slate-400">{Math.round(confidence * 100)}%</span>
                      </label>
                      <label className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          checked={simulateUnderwater}
                          onChange={(e) => setSimulateUnderwater(e.target.checked)}
                          className="rounded border-dark-border accent-lavender-500"
                        />
                        <span className="text-sm text-slate-400">Underwater simulation</span>
                      </label>
                    </div>
                    {simulateUnderwater && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                            Turbidity
                          </span>
                          <select
                            value={turbidity}
                            onChange={(e) => setTurbidity(e.target.value as "low" | "medium" | "high")}
                            className="w-full rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-sm text-slate-200"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </label>
                        <label className="flex items-center gap-2 pt-6">
                          <input
                            type="checkbox"
                            checked={marineSnow}
                            onChange={(e) => setMarineSnow(e.target.checked)}
                            className="rounded border-dark-border accent-lavender-500"
                          />
                          <span className="text-sm text-slate-400">Marine snow</span>
                        </label>
                      </div>
                    )}
                    <ImageUploadAndRun
                      onRun={runImageDetectionBatch}
                      loading={loading}
                      loadingProgress={loadingProgress}
                      accepted="image/jpeg,image/png,image/webp"
                    />
                  </div>

                  <div className="flex flex-col">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                      <span>Live preview</span>
                      {annotatedImages.length > 0 && (
                        <span className="rounded-full bg-lavender-500/10 px-2 py-0.5 text-[10px] font-medium text-lavender-200">
                          Image {activeImageIndex + 1} / {annotatedImages.length}
                        </span>
                      )}
                    </div>
                    <div className="relative flex min-h-[280px] flex-1 items-center justify-center overflow-hidden rounded-xl border border-dark-border bg-dark-surface/60">
                      {annotatedImages.length > 0 ? (
                        <>
                          <img
                            src={`data:image/jpeg;base64,${annotatedImages[activeImageIndex]}`}
                            alt="Annotated detection"
                            className="max-h-[320px] w-full cursor-zoom-in object-contain"
                            onClick={() =>
                              openImageModal(
                                `data:image/jpeg;base64,${annotatedImages[activeImageIndex]}`,
                                `Detection ${activeImageIndex + 1} / ${annotatedImages.length}`
                              )
                            }
                          />
                          {annotatedImages.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveImageIndex((prev) =>
                                    prev === 0 ? annotatedImages.length - 1 : prev - 1
                                  )
                                }
                                className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-sm text-white hover:bg-black/70"
                                aria-label="Previous image"
                              >
                                ‹
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveImageIndex((prev) =>
                                    prev === annotatedImages.length - 1 ? 0 : prev + 1
                                  )
                                }
                                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-sm text-white hover:bg-black/70"
                                aria-label="Next image"
                              >
                                ›
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <p className="px-6 py-10 text-center text-sm text-slate-500">
                          No run yet. Upload a frame (or multiple) and click{" "}
                          <span className="font-medium text-lavender-300">Run detection</span>.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {Object.keys(detCounts).length > 0 && tab === "image" && (
                <section className="rounded-2xl border border-dark-border bg-dark-card/70 p-6 shadow-lavender-glow/30 backdrop-blur-md">
                  <h2 className="mb-4 font-display text-lg font-semibold text-white">
                    Detections this session
                  </h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {Object.entries(detCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cls, count]) => {
                        const sev = getSeverity(cls);
                        const icon = getIcon(cls);
                        return (
                          <div
                            key={cls}
                            className={`rounded-xl border p-4 text-center ${sev.bg}`}
                          >
                            <span className="text-2xl">{icon}</span>
                            <p className="mt-1 font-display font-semibold text-white">
                              {cls.replace(/_/g, " ")}
                            </p>
                            <p className={`text-lg font-bold ${sev.color}`}>{count}×</p>
                            <p className="text-xs text-slate-500">{sev.label}</p>
                          </div>
                        );
                      })}
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {/* ── Video tab ───────────────────────────────────────────────── */}
          {tab === "video" && (
            <motion.div
              key="video"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-8"
            >
              <section className="rounded-2xl border border-dark-border bg-dark-card/70 p-6 shadow-lavender-glow/30 backdrop-blur-md">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-white">
                      Video analysis
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Upload a short clip (mp4, avi, mov). We sample frames and run detection; results merge into Mission Report.
                    </p>
                  </div>
                  <span className="rounded-full border border-lavender-500/40 bg-lavender-500/10 px-3 py-1.5 text-xs font-medium text-lavender-200">
                    Frame sampling
                  </span>
                </div>
                <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                      Confidence
                    </span>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.05"
                      value={confidence}
                      onChange={(e) => setConfidence(Number(e.target.value))}
                      className="w-full accent-lavender-500"
                    />
                    <span className="mt-1 block text-xs text-slate-400">{Math.round(confidence * 100)}%</span>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                      Frame skip
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={frameSkip}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setFrameSkip(Number.isNaN(v) || v < 1 ? 1 : v);
                      }}
                      className="w-full rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-sm text-slate-200"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                      Max frames
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      value={maxFrames}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setMaxFrames(Number.isNaN(v) || v < 0 ? 0 : v);
                      }}
                      className="w-full rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-sm text-slate-200"
                    />
                    <span className="mt-1 block text-xs text-slate-500">
                      0 = full video (all sampled frames). Higher values may be slower on long clips.
                    </span>
                  </label>
                </div>
                <VideoUploadAndRun onRun={runVideoAnalysis} loading={loading} />
              </section>
            </motion.div>
          )}

          {/* ── Mission Report tab ───────────────────────────────────────── */}
          {tab === "report" && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-8"
            >
              {anomalyLog.length === 0 ? (
                <div className="rounded-2xl border border-dark-border bg-dark-card/60 p-12 text-center backdrop-blur-sm">
                  <p className="text-slate-500">
                    No detections yet. Run <button type="button" onClick={() => setTab("image")} className="text-lavender-400 underline">image</button> or{" "}
                    <button type="button" onClick={() => setTab("video")} className="text-lavender-400 underline">video</button> detection first.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <MetricCard label="Total" value={summary.total} accent="white" />
                    <MetricCard label="Critical" value={summary.critical} accent="red" />
                    <MetricCard label="Warnings" value={summary.warnings} accent="amber" />
                    <MetricCard label="Normal" value={summary.normal} accent="emerald" />
                  </div>

                  <div className="grid gap-8 lg:grid-cols-2">
                    <section className="rounded-2xl border border-dark-border bg-dark-card/60 p-6 backdrop-blur-sm">
                      <h2 className="mb-4 font-display text-lg font-semibold text-white">
                        Breakdown by class
                      </h2>
                      <ul className="space-y-2">
                        {Object.entries(detCounts)
                          .sort((a, b) => b[1] - a[1])
                          .map(([cls, count]) => {
                            const sev = getSeverity(cls);
                            const icon = getIcon(cls);
                            const pct = summary.total ? ((count / summary.total) * 100).toFixed(1) : "0";
                            return (
                              <li
                                key={cls}
                                className="flex items-center justify-between rounded-lg border border-dark-border bg-dark-surface/50 px-4 py-3"
                              >
                                <span className="flex items-center gap-2">
                                  <span>{icon}</span>
                                  <span className="font-medium text-slate-200">
                                    {cls.replace(/_/g, " ")}
                                  </span>
                                </span>
                                <span className="text-sm text-slate-400">
                                  {count}× · {pct}%
                                </span>
                                <span className={`text-xs font-semibold ${sev.color}`}>{sev.label}</span>
                              </li>
                            );
                          })}
                      </ul>
                    </section>

                    <section className="rounded-2xl border border-dark-border bg-dark-card/60 p-6 backdrop-blur-sm">
                      <h2 className="mb-4 font-display text-lg font-semibold text-white">
                        Mission details (for PDF)
                      </h2>
                      <div className="space-y-3">
                        <InputLabel label="Mission name" value={missionName} onChange={setMissionName} />
                        <InputLabel label="Operator" value={operatorName} onChange={setOperatorName} />
                        <InputLabel label="Vessel / ROV" value={vesselId} onChange={setVesselId} />
                        <InputLabel label="Location" value={location} onChange={setLocation} />
                      </div>
                    </section>
                  </div>

                  {anomalyLog.length > 0 && (
                    <section className="rounded-2xl border border-dark-border bg-dark-card/60 p-6 backdrop-blur-sm">
                      <h2 className="mb-4 font-display text-lg font-semibold text-white">
                        Detection timeline
                      </h2>
                      <ul className="max-h-64 space-y-2 overflow-y-auto">
                        {anomalyLog.map((item, i) => {
                          const sev = getSeverity(item.class_name);
                          const icon = getIcon(item.class_name);
                          return (
                            <li
                              key={i}
                              className="flex items-center justify-between gap-2 rounded-lg border border-dark-border bg-dark-surface/50 px-4 py-2"
                            >
                              <span className="flex items-center gap-2">
                                <span>{icon}</span>
                                <span className="text-sm text-slate-200">
                                  {item.class_name.replace(/_/g, " ")}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {Math.round(item.confidence * 100)}%
                                </span>
                              </span>
                              <span className={`text-xs font-medium ${sev.color}`}>{sev.label}</span>
                              <span className="font-mono text-xs text-slate-500">{item.timestamp}</span>
                              <button
                                type="button"
                                onClick={() => removeAnomalyAtIndex(i)}
                                className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                                title="Remove from report (exclude from PDF)"
                                aria-label="Remove from report"
                              >
                                ×
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  )}

                  <section className="rounded-2xl border border-dark-border bg-dark-card/60 p-6 backdrop-blur-sm">
                    <h2 className="mb-4 font-display text-lg font-semibold text-white">
                      Anomaly snapshots
                    </h2>
                    <p className="mb-4 text-xs text-slate-500">
                      Remove any snapshot with the × button so it is not included in the PDF report.
                    </p>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                      {anomalyLog.map((item, i) => (
                        <div
                          key={i}
                          className="relative overflow-hidden rounded-xl border border-dark-border"
                        >
                          <button
                            type="button"
                            onClick={() => removeAnomalyAtIndex(i)}
                            className="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/90 text-white shadow hover:bg-red-500"
                            title="Remove from report (exclude from PDF)"
                            aria-label="Remove from report"
                          >
                            ×
                          </button>
                          {item.frame_bytes_base64 ? (
                            <button
                              type="button"
                              onClick={() =>
                                openImageModal(
                                  `data:image/jpeg;base64,${item.frame_bytes_base64}`,
                                  `${item.class_name.replace(/_/g, " ")} · ${item.timestamp}`
                                )
                              }
                              className="block h-28 w-full cursor-zoom-in overflow-hidden"
                            >
                              <img
                                src={`data:image/jpeg;base64,${item.frame_bytes_base64}`}
                                alt={`${item.class_name} ${item.timestamp}`}
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ) : (
                            <div className="flex h-28 items-center justify-center bg-dark-surface text-slate-500">
                              No frame
                            </div>
                          )}
                          <div className="border-t border-dark-border bg-dark-surface/80 px-2 py-1.5 text-center text-xs text-slate-400">
                            {getIcon(item.class_name)} {item.class_name.replace(/_/g, " ")} · {item.timestamp}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={handleGenerateReport}
                      disabled={reportLoading}
                      className="rounded-xl bg-gradient-to-r from-lavender-600 to-lavender-700 px-6 py-3 text-sm font-semibold text-white shadow-lavender-glow transition hover:from-lavender-500 hover:to-lavender-600 disabled:opacity-60"
                    >
                      {reportLoading ? "Generating…" : "Generate PDF report"}
                    </button>
                    <button
                      type="button"
                      onClick={resetSession}
                      className="rounded-xl border border-dark-border px-4 py-2 text-sm font-medium text-slate-400 transition hover:border-red-500/50 hover:text-red-300"
                    >
                      Reset session
                    </button>
                  </div>

                  {agentResult && (
                    <section className="mt-6 rounded-2xl border border-lavender-500/40 bg-dark-card/80 p-4 text-sm text-slate-200">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="font-display text-sm font-semibold text-white">
                          Agent mission triage — {agentResult.risk_level} risk (auto after run)
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-lavender-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-lavender-200">
                            WhatsApp {agentResult.whatsapp.sent ? "sent" : "not sent"}
                          </span>
                          {agentResult.llm_used && (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                              LLM enhanced
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-300">{agentResult.headline}</p>
                      {agentResult.bullets.length > 0 && (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-300">
                          {agentResult.bullets.map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-3 text-xs text-slate-400">
                        Recommendation: {agentResult.recommendations}
                      </p>
                    </section>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {imageModalSrc && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-zoom-out"
            onClick={closeImageModal}
            aria-label="Close image viewer"
          />
          <div className="relative z-10 max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl border border-dark-border bg-dark-card/90 p-4 shadow-2xl">
            <div className="mb-2 flex items-center justify-between gap-4 text-xs text-slate-400">
              <span className="truncate">{imageModalCaption}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded border border-dark-border px-2 py-1 text-xs hover:border-slate-500"
                  onClick={() => setImageModalZoom((z) => Math.max(0.5, z - 0.25))}
                >
                  -
                </button>
                <span className="w-10 text-center">{Math.round(imageModalZoom * 100)}%</span>
                <button
                  type="button"
                  className="rounded border border-dark-border px-2 py-1 text-xs hover:border-slate-500"
                  onClick={() => setImageModalZoom((z) => Math.min(3, z + 0.25))}
                >
                  +
                </button>
                <button
                  type="button"
                  className="rounded border border-dark-border px-2 py-1 text-xs hover:border-slate-500"
                  onClick={() => setImageModalZoom(1)}
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="max-h-[80vh] max-w-[88vw] overflow-auto rounded-xl bg-black/40">
              <img
                src={imageModalSrc}
                alt={imageModalCaption || "Zoomed detection"}
                className="mx-auto block"
                style={{ transform: `scale(${imageModalZoom})`, transformOrigin: "center center" }}
              />
            </div>
            <button
              type="button"
              onClick={closeImageModal}
              className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-sm text-slate-200 hover:bg-black/80"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "white" | "red" | "amber" | "emerald";
}) {
  const border =
    accent === "red"
      ? "border-t-red-500/50"
      : accent === "amber"
        ? "border-t-amber-500/50"
        : accent === "emerald"
          ? "border-t-emerald-500/50"
          : "border-t-lavender-500/50";
  const text =
    accent === "red"
      ? "text-red-400"
      : accent === "amber"
        ? "text-amber-400"
        : accent === "emerald"
          ? "text-emerald-400"
          : "text-white";
  return (
    <div className={`rounded-xl border border-dark-border border-t-[3px] bg-dark-card/80 p-5 backdrop-blur-sm ${border}`}>
      <p className={`font-display text-3xl font-bold md:text-4xl ${text}`}>{value}</p>
      <p className="mt-2 text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

function InputLabel({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-sm text-slate-200"
      />
    </label>
  );
}

function ImageUploadAndRun({
  onRun,
  loading,
  loadingProgress,
  accepted,
}: {
  onRun: (files: File[]) => void;
  loading: boolean;
  loadingProgress?: string | null;
  accepted: string;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const inputId = "image-upload-multi";
  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const list = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
          if (list.length) setFiles(list);
        }}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
          drag ? "border-lavender-500 bg-lavender-500/10" : "border-dark-border bg-dark-surface/30"
        }`}
      >
        <input
          type="file"
          accept={accepted}
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="hidden"
          id={inputId}
        />
        <label htmlFor={inputId} className="cursor-pointer">
          {files.length > 0 ? (
            <p className="text-sm text-slate-300">
              {files.length} image{files.length !== 1 ? "s" : ""} selected
              {files.length <= 3 ? `: ${files.map((f) => f.name).join(", ")}` : ` (e.g. ${files[0].name}, …)`}
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              Drop image(s) here or <span className="text-lavender-400 underline">browse</span> to select multiple
            </p>
          )}
        </label>
      </div>
      <button
        type="button"
        disabled={files.length === 0 || loading}
        onClick={() => files.length && onRun(files)}
        className="w-full rounded-xl bg-gradient-to-r from-lavender-600 to-lavender-700 py-3 text-sm font-semibold text-white shadow-lavender-glow transition hover:from-lavender-500 disabled:opacity-50"
      >
        {loading ? (loadingProgress ?? "Running detection…") : "Run detection"}
      </button>
    </div>
  );
}

function VideoUploadAndRun({
  onRun,
  loading,
}: {
  onRun: (file: File) => void;
  loading: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-dashed border-dark-border bg-dark-surface/30 p-8 text-center">
        <input
          type="file"
          accept="video/mp4,video/avi,video/quicktime,.mp4,.avi,.mov"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-lavender-600 file:px-4 file:py-2 file:text-white file:transition hover:file:bg-lavender-500"
        />
        {file && <p className="mt-2 text-xs text-slate-500">{file.name}</p>}
      </div>
      <button
        type="button"
        disabled={!file || loading}
        onClick={() => file && onRun(file)}
        className="w-full rounded-xl bg-gradient-to-r from-lavender-600 to-lavender-700 py-3 text-sm font-semibold text-white shadow-lavender-glow transition hover:from-lavender-500 disabled:opacity-50"
      >
        {loading ? "Analyzing video…" : "Run video analysis"}
      </button>
    </div>
  );
}
