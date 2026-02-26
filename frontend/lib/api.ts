/**
 * NautiCAI Detection API client.
 * Backend: FastAPI at NEXT_PUBLIC_API_URL (default: Render production URL).
 */

const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL?.trim()) ||
  "https://nauticai.onrender.com";

export type DetectionItem = {
  class_name: string;
  confidence: number;
  severity: string;
};

export type AnomalyLogItem = {
  class_name: string;
  confidence: number;
  timestamp: string;
  frame_bytes_base64?: string;
};

export type Summary = {
  total: number;
  critical: number;
  warnings: number;
  normal: number;
};

export type DetectImageResponse = {
  detections: DetectionItem[];
  det_counts: Record<string, number>;
  anomaly_log: AnomalyLogItem[];
  annotated_image_base64: string;
  summary: Summary;
};

export type DetectVideoResponse = {
  anomaly_log: AnomalyLogItem[];
  det_counts: Record<string, number>;
  summary: Summary;
  frames_processed: number;
};

export type AgentMissionResponse = {
  risk_level: "HIGH" | "MEDIUM" | "LOW" | "NONE" | string;
  headline: string;
  bullets: string[];
  highlights: string[];
  recommendations: string;
  whatsapp_message: string;
  whatsapp: {
    attempted: boolean;
    sent: boolean;
    info: string;
  };
  llm_used?: boolean;
};

export async function detectImage(form: FormData): Promise<DetectImageResponse> {
  const res = await fetch(`${API_BASE}/api/detect/image`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Image detection failed");
  }
  return res.json();
}

export async function detectVideo(form: FormData): Promise<DetectVideoResponse> {
  const res = await fetch(`${API_BASE}/api/detect/video`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Video analysis failed");
  }
  return res.json();
}

export async function generateReport(
  body: {
    anomaly_log: AnomalyLogItem[];
    mission_name: string;
    operator_name: string;
    vessel_id: string;
    location: string;
  }
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/report/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Report generation failed");
  }
  return res.blob();
}

export async function runAgentMission(body: {
  anomaly_log: AnomalyLogItem[];
  det_counts: Record<string, number>;
  summary: Summary;
  mission_name: string;
  operator_name: string;
  vessel_id: string;
  location: string;
  phone?: string | null;
  send_whatsapp?: boolean;
}): Promise<AgentMissionResponse> {
  const res = await fetch(`${API_BASE}/api/agent/mission-summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Agent mission analysis failed");
  }
  return res.json();
}

export async function healthCheck(): Promise<{ status: string; model: string; classes: string[] }> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error("API unavailable");
  return res.json();
}
