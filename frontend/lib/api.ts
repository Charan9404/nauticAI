/**
 * NautiCAI Detection API client.
 * Production: frontend https://nautic-ai.vercel.app → backend https://nauticai.onrender.com
 *
 * Rules:
 * - On localhost (dev): use NEXT_PUBLIC_API_URL if set, else http://localhost:8000.
 * - On any deployed domain (e.g. Vercel): always use the Render backend https://nauticai.onrender.com
 *   so a misconfigured NEXT_PUBLIC_API_URL can’t accidentally point to localhost in production.
 */

const DEFAULT_PROD_API = "https://nauticai.onrender.com";

function resolveApiBase(): string {
  // Browser runtime (client-side)
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocalhost =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]";

    if (isLocalhost) {
      // Local dev: allow overriding via env, default to local API
      return (
        (typeof process !== "undefined" &&
          process.env.NEXT_PUBLIC_API_URL?.trim()) ||
        "http://localhost:8000"
      );
    }

    // Any deployed domain (Vercel, custom, etc.): force production backend
    return DEFAULT_PROD_API;
  }

  // Server-side / build time: fall back to env or prod default
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL?.trim()) {
    return process.env.NEXT_PUBLIC_API_URL.trim();
  }

  return DEFAULT_PROD_API;
}

export const API_BASE = resolveApiBase();

export type UserProfile = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  created_at?: string | null;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: UserProfile;
};

function authHeaders(token?: string, extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return { ...headers, ...(extra || {}) };
}

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

export async function registerUser(body: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Registration failed");
  }
  return res.json();
}

export async function loginUser(body: { email: string; password: string }): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Invalid credentials");
  }
  return res.json();
}

export async function fetchCurrentUser(token: string): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error("Session expired");
  }
  return res.json();
}

export async function detectImage(form: FormData, token?: string): Promise<DetectImageResponse> {
  const res = await fetch(`${API_BASE}/api/detect/image`, {
    method: "POST",
    body: form,
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Image detection failed");
  }
  return res.json();
}

export async function detectVideo(form: FormData, token?: string): Promise<DetectVideoResponse> {
  const res = await fetch(`${API_BASE}/api/detect/video`, {
    method: "POST",
    body: form,
    headers: authHeaders(token),
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
  },
  token?: string,
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/report/generate`, {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
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
}, token?: string): Promise<AgentMissionResponse> {
  const res = await fetch(`${API_BASE}/api/agent/mission-summary`, {
    method: "POST",
    headers: authHeaders(token, { "Content-Type": "application/json" }),
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
