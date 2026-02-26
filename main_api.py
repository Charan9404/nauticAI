"""
NautiCAI - FastAPI Backend
Thin API layer over existing YOLO model, underwater_augment, and report_gen.
Model and training code are unchanged. Run: uvicorn main_api:app --reload --host 0.0.0.0 --port 8000
"""

import os
import sys
import time
import tempfile
import base64
import io
from pathlib import Path
import json

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from twilio.rest import Client as TwilioClient

# Ensure project root is on path when running as uvicorn main_api:app
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Load environment variables from .env (if present)
load_dotenv(BASE_DIR / ".env")

from underwater_augment import apply_full_underwater_simulation
from report_gen import generate_report

# ── Constants (mirror app.py, no change to model) ─────────────────────────────
SEVERITY = {
    "corrosion": ("CRITICAL", "c", "b-c"),
    "damage": ("CRITICAL", "c", "b-c"),
    "free_span": ("CRITICAL", "c", "b-c"),
    "marine_growth": ("WARNING", "w", "b-w"),
    "debris": ("WARNING", "w", "b-w"),
    "healthy": ("NORMAL", "n", "b-n"),
    "anode": ("NORMAL", "n", "b-n"),
}
DIFF_THRESHOLD = 0.50
CLASS_NAMES = list(SEVERITY.keys())  # Used by lightweight health check (no model load)

MODEL_PATH = BASE_DIR / "weights" / "best.pt"

# ── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="NautiCAI API",
    description="Underwater anomaly detection — image/video inference and PDF report generation",
    version="1.0.0",
)

FRONTEND_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://nautic-ai-osjw.vercel.app",
    "https://nautic-ai.vercel.app",   # Production frontend
    "https://nautic_ai.vercel.app",   # Vercel alternate origin (if used)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Model (lazy load on first request to keep Render free tier under 512MB at startup) ──
model = None

def get_model():
    """
    Lazily import and initialize the YOLO model on first real detection request.
    This avoids importing ultralytics/torch during startup and keeps Render health
    checks fast and lightweight.
    """
    global model
    if model is None:
        from ultralytics import YOLO  # Local import to avoid heavy startup cost
        if MODEL_PATH.exists():
            model = YOLO(str(MODEL_PATH))
        else:
            model = YOLO("yolov8n.pt")
    return model


def get_twilio_client():
    """Return (client, from_number) if Twilio WhatsApp is configured, else (None, None)."""
    sid = os.getenv("TWILIO_ACCOUNT_SID")
    token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_WHATSAPP_FROM")  # e.g. 'whatsapp:+14155238886'
    if not (sid and token and from_number):
        return None, None
    try:
        client = TwilioClient(sid, token)
    except Exception:
        return None, None
    return client, from_number


def send_whatsapp_alert(phone: str, body: str) -> tuple[bool, str]:
    """
    Send a WhatsApp message using Twilio.
    Expects phone like '+6587654321'; we prefix with 'whatsapp:' as required by Twilio.
    """
    client, from_number = get_twilio_client()
    if client is None or from_number is None:
        return False, "Twilio WhatsApp not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)"
    to = phone.strip()
    if not to.startswith("whatsapp:"):
        to = f"whatsapp:{to}"
    try:
        msg = client.messages.create(from_=from_number, to=to, body=body)
        return True, msg.sid
    except Exception as e:
        return False, str(e)


def call_gemini_mission_agent(
    *,
    risk_level: str,
    mission_name: str,
    vessel_id: str,
    location: str,
    operator_name: str,
    anomaly_log: list,
    det_counts: dict,
    summary: dict,
    base_headline: str,
    base_recommendations: str,
    base_whatsapp_message: str,
) -> dict | None:
    """
    Optional LLM enhancement using Google Gemini.
    Returns a dict:
      {
        "parsed": {...} or None,
        "raw": <full model message content as string> or None
      }
    Falls back to heuristics if GEMINI_API_KEY or requests isn't available, or on any error.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        import requests  # type: ignore
    except Exception:
        return None

    system_prompt = (
        "You are an underwater inspection mission assistant for NautiCAI. "
        "Given structured detection data from hull/pipeline missions, you must:\n"
        "1) Explain the mission risk level briefly.\n"
        "2) Summarize the most important anomalies for an ROV/AUV operator.\n"
        "3) Provide clear, concise next-step recommendations.\n"
        "4) Generate a short WhatsApp-friendly alert message.\n"
        "Respond strictly in compact JSON with keys: "
        "headline (string), bullets (array of strings), "
        "recommendations (string), whatsapp_message (string).\n\n"
        "The whatsapp_message MUST follow this structure:\n"
        "  - First line: \"Hey <operator_name>, we found <short risk summary>.\" (friendly but professional)\n"
        "  - Then a blank line.\n"
        "  - One line: \"Mission: <mission_name>\".\n"
        "  - One line: \"Vessel/ROV: <vessel_id>\".\n"
        "  - One line: \"Location: <location>\".\n"
        "  - Blank line.\n"
        "  - One line summarising counts, e.g. \"Detections: total=<total>, critical=<critical>, warnings=<warnings>.\".\n"
        "  - Then a short bulleted list (max 3 bullets) of key findings, one per line, starting with \"• \".\n"
        "  - Final line starting with \"Recommendation:\" and a concise action item.\n"
        "Do not wrap the message in backticks or quotes. Keep it under 8 lines total."
    )

    payload = {
        "risk_level": risk_level,
        "mission_name": mission_name,
        "vessel_id": vessel_id,
        "location": location,
        "operator_name": operator_name,
        "anomaly_log": anomaly_log[:32],  # trim to keep payload small
        "det_counts": det_counts,
        "summary": summary,
        "base_headline": base_headline,
        "base_recommendations": base_recommendations,
        "base_whatsapp_message": base_whatsapp_message,
    }

    user_prompt = (
        "Here is the mission data in JSON format:\n"
        f"{json.dumps(payload, ensure_ascii=False, indent=2)}\n\n"
        "Rewrite headline, bullets, recommendations and especially whatsapp_message to match the structure described "
        "above. Use operator_name, mission_name, vessel_id, location, summary.total, summary.critical and "
        "summary.warnings when constructing the message. "
        "Return only JSON, no explanations."
    )

    try:
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        resp = requests.post(
            endpoint,
            headers={"Content-Type": "application/json"},
            json={
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {
                                "text": system_prompt
                                + "\n\n"
                                + user_prompt
                            }
                        ],
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 512,
                    "responseMimeType": "application/json",
                },
            },
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        candidates = data.get("candidates") or []
        if not candidates:
            return None
        parts = candidates[0].get("content", {}).get("parts") or []
        if not parts:
            return None
        content = parts[0].get("text", "")
        # Try strict JSON first (response_format=json_object should enforce this)
        parsed = None
        try:
            parsed = json.loads(content)
        except Exception:
            # Fallback: extract first JSON object from the text
            start = content.find("{")
            end = content.rfind("}")
            if start != -1 and end != -1 and end > start:
                json_str = content[start : end + 1]
                try:
                    parsed = json.loads(json_str)
                except Exception:
                    parsed = None
        return {"parsed": parsed, "raw": content}
    except Exception:
        return None

# ── Smart log (same logic as Streamlit, no session state) ───────────────────
def smart_log(cn: str, cf: float, ts: str, frame_bytes: bytes, class_tracker: dict, anomaly_log: list, det_counts: dict) -> bool:
    if cn not in class_tracker:
        anomaly_log.append({
            "class_name": cn,
            "confidence": cf,
            "timestamp": ts,
            "frame_bytes": frame_bytes,
        })
        det_counts[cn] = det_counts.get(cn, 0) + 1
        class_tracker[cn] = [cf]
        return True
    logged_confs = class_tracker[cn]
    is_different = all(abs(cf - prev) >= DIFF_THRESHOLD for prev in logged_confs)
    if is_different:
        anomaly_log.append({
            "class_name": cn,
            "confidence": cf,
            "timestamp": ts,
            "frame_bytes": frame_bytes,
        })
        det_counts[cn] = det_counts.get(cn, 0) + 1
        class_tracker[cn].append(cf)
        return True
    return False

# ── Schemas ─────────────────────────────────────────────────────────────────
class ReportGenerateRequest(BaseModel):
    anomaly_log: list = Field(..., description="List of detections; frame_bytes can be base64 string or omitted")
    mission_name: str = Field(default="Subsea Inspection Mission")
    operator_name: str = Field(default="NautiCAI Operator")
    vessel_id: str = Field(default="ROV-NautiCAI-01")
    location: str = Field(default="Offshore Location")


class AgentMissionRequest(BaseModel):
    anomaly_log: list = Field(..., description="Client anomaly_log (class_name, confidence, timestamp, frame_bytes_base64)")
    det_counts: dict = Field(default_factory=dict)
    summary: dict = Field(default_factory=dict)
    mission_name: str = Field(default="Subsea Inspection Mission")
    operator_name: str = Field(default="NautiCAI Operator")
    vessel_id: str = Field(default="ROV-NautiCAI-01")
    location: str = Field(default="Offshore Location")
    phone: str | None = Field(default=None, description="Destination WhatsApp number in E.164 format, e.g. +6587654321")
    send_whatsapp: bool = Field(default=True, description="If true and phone present, attempt to send WhatsApp alert")

# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    """
    Lightweight liveness check for Render (no model load).
    Returns quickly to avoid health-check timeouts and extra memory; model loads on first /api/detect/* only.
    """
    return {
        "status": "ok",
        "model": "Custom YOLOv8s" if MODEL_PATH.exists() else "YOLOv8n Baseline",
        "classes": CLASS_NAMES,
    }

@app.post("/api/detect/image")
async def detect_image(
    file: UploadFile = File(...),
    confidence: float = Form(0.25),
    simulate_underwater: bool = Form(False),
    turbidity: str = Form("medium"),
    marine_snow: bool = Form(True),
):
    """
    Upload an image, run YOLOv8 inference, return detections and annotated image.
    anomaly_log items include frame_bytes as base64 for use in report generation.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image (jpg, png, etc.)")

    try:
        raw = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")

    # Lazy imports avoid heavy cv2/numpy import cost during service startup
    try:
        import cv2
        import numpy as np
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import image libraries: {e}")

    img = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    if simulate_underwater:
        proc = apply_full_underwater_simulation(img, turbidity, marine_snow)
    else:
        proc = img.copy()

    m = get_model()
    results = m.predict(proc, conf=confidence, verbose=False)
    res = results[0]
    ann = res.plot()
    boxes = res.boxes

    detections = []
    anomaly_log = []
    det_counts = {}
    class_tracker = {}
    ts = time.strftime("%H:%M:%S")

    if boxes is not None and len(boxes) > 0:
        import cv2
        _, buf = cv2.imencode(".jpg", cv2.cvtColor(ann, cv2.COLOR_BGR2RGB))
        frame_bytes = buf.tobytes()
        for box in boxes:
            cn = m.names[int(box.cls[0])]
            cf = float(box.conf[0])
            detections.append({
                "class_name": cn,
                "confidence": cf,
                "severity": SEVERITY.get(cn, ("WARNING", "w", "b-w"))[0],
            })
            smart_log(cn, cf, ts, frame_bytes, class_tracker, anomaly_log, det_counts)

    # Encode annotated image for frontend
    import cv2
    _, ann_buf = cv2.imencode(".jpg", cv2.cvtColor(ann, cv2.COLOR_BGR2RGB))
    annotated_base64 = base64.b64encode(ann_buf.tobytes()).decode("utf-8")

    # For report API, frontend needs anomaly_log with frame_bytes as base64
    anomaly_log_for_client = []
    for item in anomaly_log:
        entry = {
            "class_name": item["class_name"],
            "confidence": item["confidence"],
            "timestamp": item["timestamp"],
        }
        if item.get("frame_bytes"):
            entry["frame_bytes_base64"] = base64.b64encode(item["frame_bytes"]).decode("utf-8")
        anomaly_log_for_client.append(entry)

    return {
        "detections": detections,
        "det_counts": det_counts,
        "anomaly_log": anomaly_log_for_client,
        "annotated_image_base64": annotated_base64,
        "summary": {
            "total": len(anomaly_log),
            "critical": sum(1 for x in anomaly_log if x["class_name"] in ("corrosion", "damage", "free_span")),
            "warnings": sum(1 for x in anomaly_log if x["class_name"] in ("marine_growth", "debris")),
            "normal": sum(1 for x in anomaly_log if x["class_name"] in ("healthy", "anode")),
        },
    }

@app.post("/api/detect/video")
async def detect_video(
    file: UploadFile = File(...),
    confidence: float = Form(0.25),
    simulate_underwater: bool = Form(False),
    turbidity: str = Form("medium"),
    marine_snow: bool = Form(True),
    frame_skip: int = Form(1),
    max_frames: int = Form(0),
):
    """
    Upload a video, run detection on sampled frames, return anomaly_log and summary.
    anomaly_log items include frame_bytes as base64 for report generation.
    """
    if not file.filename or not any(file.filename.lower().endswith(ext) for ext in (".mp4", ".avi", ".mov")):
        raise HTTPException(status_code=400, detail="File must be a video (mp4, avi, mov)")

    try:
        raw = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")

    suffix = Path(file.filename or "video").suffix or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as t:
        t.write(raw)
        t.flush()
        path = t.name

    try:
        import cv2

        cap = cv2.VideoCapture(path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Could not open video")

        frames_total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = max(cap.get(cv2.CAP_PROP_FPS), 1)

        anomaly_log = []
        det_counts = {}
        class_tracker = {}
        m = get_model()
        pc = 0
        fc = 0

        while cap.isOpened() and (max_frames <= 0 or pc < max_frames):
            ret, frame = cap.read()
            if not ret:
                break
            fc += 1
            if fc % frame_skip != 0:
                continue

            if simulate_underwater:
                frame = apply_full_underwater_simulation(frame, turbidity, marine_snow)

            results = m.predict(frame, conf=confidence, verbose=False)
            ann = results[0].plot()
            current_sec = fc / fps
            mm, ss = int(current_sec // 60), int(current_sec % 60)
            ts = f"{mm:02d}:{ss:02d}"

            if results[0].boxes and len(results[0].boxes) > 0:
                import cv2
                _, buf = cv2.imencode(".jpg", cv2.cvtColor(ann, cv2.COLOR_BGR2RGB))
                frame_bytes = buf.tobytes()
                best_per_class = {}
                for box in results[0].boxes:
                    cn = m.names[int(box.cls[0])]
                    cf = float(box.conf[0])
                    if cn not in best_per_class or cf > best_per_class[cn]:
                        best_per_class[cn] = cf
                for cn, cf in best_per_class.items():
                    smart_log(cn, cf, ts, frame_bytes, class_tracker, anomaly_log, det_counts)

            pc += 1

        cap.release()
    finally:
        try:
            os.unlink(path)
        except Exception:
            pass

    # Build client-friendly anomaly_log with base64 frame_bytes
    anomaly_log_for_client = []
    for item in anomaly_log:
        entry = {
            "class_name": item["class_name"],
            "confidence": item["confidence"],
            "timestamp": item["timestamp"],
        }
        if item.get("frame_bytes"):
            entry["frame_bytes_base64"] = base64.b64encode(item["frame_bytes"]).decode("utf-8")
        anomaly_log_for_client.append(entry)

    return {
        "anomaly_log": anomaly_log_for_client,
        "det_counts": det_counts,
        "summary": {
            "total": len(anomaly_log),
            "critical": sum(1 for x in anomaly_log if x["class_name"] in ("corrosion", "damage", "free_span")),
            "warnings": sum(1 for x in anomaly_log if x["class_name"] in ("marine_growth", "debris")),
            "normal": sum(1 for x in anomaly_log if x["class_name"] in ("healthy", "anode")),
        },
        "frames_processed": pc,
    }

@app.post("/api/report/generate")
async def report_generate(body: ReportGenerateRequest):
    """
    Generate PDF from anomaly_log. Accepts anomaly_log from /api/detect/image or /api/detect/video.
    Each item may have frame_bytes_base64 (from API) or frame_bytes (bytes); we normalize to bytes for report_gen.
    """
    anomaly_log = []
    for item in body.anomaly_log:
        entry = {
            "class_name": item.get("class_name", "unknown"),
            "confidence": float(item.get("confidence", 0)),
            "timestamp": item.get("timestamp", "N/A"),
        }
        if item.get("frame_bytes_base64"):
            try:
                entry["frame_bytes"] = base64.b64decode(item["frame_bytes_base64"])
            except Exception:
                entry["frame_bytes"] = None
        elif item.get("frame_bytes"):
            # If client sent raw bytes in JSON (uncommon), would need special handling; base64 is preferred
            entry["frame_bytes"] = item["frame_bytes"]
        else:
            entry["frame_bytes"] = None
        anomaly_log.append(entry)

    try:
        pdf_bytes = generate_report(
            anomaly_log=anomaly_log,
            mission_name=body.mission_name,
            operator_name=body.operator_name,
            vessel_id=body.vessel_id,
            location=body.location,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {e}")

    filename = f"nauticai_{time.strftime('%Y%m%d_%H%M%S')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/agent/mission-summary")
async def agent_mission_summary(body: AgentMissionRequest):
    """
    Agentic mission triage:
    - Reads anomaly_log, summary and mission metadata
    - Computes a risk level
    - Generates a short natural-language summary + recommendations
    - Optionally sends a WhatsApp alert to the provided phone number via Twilio.
    """
    anomaly_log = body.anomaly_log or []
    det_counts = body.det_counts or {}
    summary = body.summary or {}

    total = summary.get("total") or len(anomaly_log)
    critical_classes = {"corrosion", "damage", "free_span"}
    warning_classes = {"marine_growth", "debris"}

    crit_count = sum(det_counts.get(cls, 0) for cls in critical_classes)
    warn_count = sum(det_counts.get(cls, 0) for cls in warning_classes)

    # Basic risk scoring heuristic
    if crit_count >= 2 or (crit_count == 1 and warn_count >= 3):
        risk_level = "HIGH"
    elif crit_count == 1 or warn_count >= 3:
        risk_level = "MEDIUM"
    elif total > 0:
        risk_level = "LOW"
    else:
        risk_level = "NONE"

    # Build bullet points highlighting top anomalies
    bullets = []
    if crit_count:
        bullets.append(f"{crit_count} critical findings (corrosion / damage / free span)")
    if warn_count:
        bullets.append(f"{warn_count} warning findings (marine growth / debris)")
    healthy = det_counts.get("healthy", 0) + det_counts.get("anode", 0)
    if healthy and total:
        bullets.append(f"{healthy} healthy / anode detections logged")

    # Pick up to 4 concrete timeline examples
    highlights = []
    for item in anomaly_log:
        if len(highlights) >= 4:
            break
        cls = str(item.get("class_name", "unknown")).replace("_", " ")
        ts = item.get("timestamp", "N/A")
        try:
            cf = float(item.get("confidence", 0))
        except Exception:
            cf = 0.0
        highlights.append(f"- {cls} at {ts} ({int(cf * 100)}% confidence)")

    # Recommendations based on risk
    if risk_level == "HIGH":
        recommendations = (
            "Immediate follow-up required: schedule targeted inspection of critical regions, validate structural "
            "integrity around free spans or damage, and review maintenance schedule for affected sections."
        )
    elif risk_level == "MEDIUM":
        recommendations = (
            "Plan follow-up inspection for highlighted regions and schedule cleaning or minor repair windows in the "
            "next maintenance cycle."
        )
    elif risk_level == "LOW":
        recommendations = (
            "Conditions are mostly acceptable. Continue routine monitoring and include highlighted regions in the next "
            "standard inspection round."
        )
    else:
        recommendations = "No anomalies detected for this mission. No immediate action required."

    headline = (
        f"Mission '{body.mission_name}' on vessel {body.vessel_id} near {body.location} has "
        f"{'no detected anomalies' if risk_level == 'NONE' else risk_level.lower() + ' risk findings'}."
    )

    # Compose WhatsApp-friendly message
    lines = [
        f"NautiCAI Mission Alert — {risk_level} RISK",
        f"Mission: {body.mission_name}",
        f"Vessel/ROV: {body.vessel_id}",
        f"Location: {body.location}",
        f"Operator: {body.operator_name}",
        "",
    ]
    if total:
        lines.append(f"Detections this mission: {total} (critical={crit_count}, warnings={warn_count})")
    else:
        lines.append("No anomalies detected in this mission.")

    if highlights:
        lines.append("Key findings:")
        lines.extend(highlights)

    lines.extend(["", f"Recommendation: {recommendations}"])
    whatsapp_message = "\n".join(lines)

    # Optional Groq LLM enhancement
    groq_enhancement = call_gemini_mission_agent(
        risk_level=risk_level,
        mission_name=body.mission_name,
        vessel_id=body.vessel_id,
        location=body.location,
        operator_name=body.operator_name,
        anomaly_log=anomaly_log,
        det_counts=det_counts,
        summary=summary,
        base_headline=headline,
        base_recommendations=recommendations,
        base_whatsapp_message=whatsapp_message,
    )
    llm_used = False
    llm_raw = None
    if groq_enhancement:
        groq_result = groq_enhancement.get("parsed") or {}
        llm_raw = groq_enhancement.get("raw")
        headline = groq_result.get("headline", headline)
        new_bullets = groq_result.get("bullets")
        if isinstance(new_bullets, list):
            bullets = [str(b) for b in new_bullets][:6]
        recommendations = groq_result.get("recommendations", recommendations)
        whatsapp_message = groq_result.get("whatsapp_message", whatsapp_message)
        llm_used = True

    if body.send_whatsapp and body.phone and risk_level in {"MEDIUM", "HIGH"}:
        sent, info = send_whatsapp_alert(body.phone, whatsapp_message)
        whatsapp_result = {"attempted": True, "sent": sent, "info": info}
    else:
        whatsapp_result = {
            "attempted": False,
            "sent": False,
            "info": "Conditions for sending WhatsApp not met (no phone, disabled, or no anomalies).",
        }

    return {
        "risk_level": risk_level,
        "headline": headline,
        "bullets": bullets,
        "highlights": highlights,
        "recommendations": recommendations,
        "whatsapp_message": whatsapp_message,
        "whatsapp": whatsapp_result,
        "llm_used": llm_used,
        "llm_raw": llm_raw,
    }
