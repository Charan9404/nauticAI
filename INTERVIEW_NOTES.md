# NautiCAI Interview Notes – Web App, Agentic AI & WhatsApp Alerts

These notes are for you to confidently explain what you built **without** going deep into model training. Your scope:

- Reuse the **existing YOLOv8 underwater anomaly model** (no retraining).
- Replace the old Streamlit UI with a **Next.js, production-style frontend**.
- Add an **agentic AI layer** that triages missions and sends **WhatsApp alerts**.
- Optionally enhance summaries with an **LLM (Gemini)**.

---

## 1. High-level architecture

- **Model & core logic (already existed)**  
  - YOLOv8 model for underwater anomalies (corrosion, damage, free span, marine growth, debris, healthy, anode).  
  - Logic to log anomalies, generate PDF reports, and simulate underwater conditions.

- **Backend API (your changes)** – `FastAPI` in `main_api.py`  
  - Exposes the model and report generation over HTTP.  
  - Adds an **agent endpoint** that performs mission triage and drives WhatsApp + LLM.

- **Frontend (your changes)** – `Next.js + React + Tailwind` under `frontend/`  
  - New marketing homepage.  
  - Auth (sign‑up/in with phone).  
  - Detection console (image, batch, video).  
  - Mission report + PDF generation.  
  - Integrated with the FastAPI backend via REST.

- **Agentic AI & communications (your changes)**  
  - Rule-based agent that classifies risk and decides when to alert.  
  - WhatsApp alerts via **Twilio**.  
  - Message wording & mission summary optionally enhanced by **Google Gemini 2.5 Flash**.

You can describe this as:

> “We decoupled the UI from the model by building a FastAPI backend and a modern Next.js frontend. On top of that, we added an agent that automatically triages each mission, and when the risk is high enough it pushes a WhatsApp alert to the operator. An LLM (Gemini) is used to polish the language of the summary and alert, but the agent’s decision logic is rule-based and deterministic.”

---

## 2. Frontend – what you built and how it works

### 2.1 Tech stack & structure

- **Framework**: Next.js (App Router), TypeScript, React.
- **Styling**: Tailwind CSS with custom theme (dark + purple/lavender, glow effects).
- **Animation**: Framer Motion for smooth transitions and hero visuals.
- **Auth**: Simple client-side auth context backed by `localStorage`:
  - `name`, `email`, `phone` stored under `nauticai:user`.
  - Used to fill operator name and phone for WhatsApp.

Key pages/components:

- `app/page.tsx` – **Landing / marketing page**
  - Header with **Product / Learn / About** and “Go to Dashboard”.
  - Product dropdown (Tenderly-style) describing the anomaly detection console.
  - “Explore the model” CTA linking to `/detect`.

- `app/learn/page.tsx` – **“Learn” page**
  - Explains what the console does:
    - Input: ROV/AUV images or video.
    - Model: YOLOv8, 7 classes.
    - Output: detections, mission metrics, PDF reports, and agent alerts.
  - Shows example anomaly images and a sample PDF screenshot.

- `app/auth/sign-up` + `app/auth/sign-in`
  - Sign‑up captures **name, email, phone, password (dummy)**.
  - Phone number is important: it’s used as the destination for WhatsApp alerts.

- `app/detect/page.tsx` – **Detection Console**
  - Three tabs: **Image Detection**, **Video Analysis**, **Mission Report**.

### 2.2 Image Detection tab

- **Flow:**
  1. User uploads **one or multiple images** (drag/drop or browse).
  2. User sets **confidence** threshold and optional **underwater simulation** (turbidity + marine snow).
  3. Click “Run detection”.
  4. Frontend sends the files and settings to `POST /api/detect/image`.
  5. Backend returns:
     - Annotated image (base64),
     - `anomaly_log` (structured detections),
     - `det_counts` (counts per class),
     - `summary` (total/critical/warnings/normal).

- **UI details:**
  - Live preview carousel: if you upload multiple images, you can flip through the annotated results with left/right arrows.
  - Mission summary strip at top: **Total / Critical / Warnings / Healthy/Anode**.
  - “Detections this session” cards: one card per class with icon, count, severity.

Important: each time you click **Run detection**, the console now treats it as a **new mission session**:

- It clears previous `anomalyLog`, `detCounts`, `summary`, `annotatedImages` and `agentResult`.
- All images in a single run (multi-select) are treated as **one mission**.

### 2.3 Video Analysis tab

- Uploads a short video (mp4/avi/mov).
- Controls:
  - **Confidence** threshold.
  - **Frame skip** (how often to sample).
  - **Max frames**:
    - `0` = process frames for the entire video (no cap).
- Sends to `POST /api/detect/video`.
- Backend:
  - Samples frames according to `frame_skip`/`max_frames`.
  - Runs YOLOv8 on each sampled frame.
  - Builds `anomaly_log`, `det_counts`, and `summary`.

Again, a video run is treated as its own mission session.

### 2.4 Mission Report tab

Shows a richer view of the mission:

- Metrics:
  - Total, critical, warnings, normal.
  - Breakdown by class with percentages.
- Mission metadata:
  - Name, Operator, Vessel/ROV, Location (editable form).
  - Operator defaults to currently signed-in user.
- **Detection timeline**:
  - List of anomalies (class, confidence, timestamp).
  - “×” button to remove an anomaly from the mission (also updates counts + summary).
- **Anomaly snapshots**:
  - Grid of up to N snapshots.
  - “×” removes a snapshot (and associated anomaly) from the report.
  - Clicking an image opens a zoomable modal.
- **Generate PDF report**:
  - Calls `POST /api/report/generate` with the current `anomaly_log` and mission metadata.
  - Triggers a download of a nicely-formatted PDF via the existing `report_gen.py`.

**Key point for interview:**  
> “From the operator’s point of view, they can upload data, see annotated detections and metrics, clean up the snapshot list, and then generate a client‑friendly PDF. They never need to touch the model internals.”

---

## 3. Agentic AI – what it does and why it’s agentic

### 3.1 Concept

The agent’s job is to:

1. **Observe** each mission’s detection results.
2. **Reason** about how risky the mission is.
3. **Act** by:
   - Generating a concise summary + recommendation.
   - Sending a WhatsApp alert to the operator when necessary.

This is implemented in the backend as `POST /api/agent/mission-summary` in `main_api.py`.

### 3.2 Inputs to the agent

The frontend calls this endpoint (now automatically after each run) with:

- `anomaly_log`: list of detections with:
  - `class_name` (e.g. `damage`, `corrosion`, `marine_growth`),
  - `confidence` (0–1),
  - `timestamp` (frame time string, e.g. `14:35:50`),
  - optionally `frame_bytes_base64` for snapshots.
- `det_counts`: dictionary of `{class_name: count}`.
- `summary`:
  - `total`, `critical`, `warnings`, `normal`.
- Mission metadata:
  - `mission_name`, `operator_name`, `vessel_id`, `location`.
- User’s phone:
  - `phone` (E.164, e.g. `+91...`),
  - `send_whatsapp` boolean.

### 3.3 Rule-based triage logic (no LLM here)

Inside `agent_mission_summary`, the agent:

1. Computes risk:
   - `critical_classes = {corrosion, damage, free_span}`
   - `warning_classes = {marine_growth, debris}`
   - `crit_count = sum(det_counts for critical classes)`
   - `warn_count = sum(det_counts for warning classes)`
   - Rules:
     - `HIGH` if:
       - `crit_count >= 2`, or
       - `crit_count == 1 and warn_count >= 3`.
     - `MEDIUM` if:
       - `crit_count == 1`, or
       - `warn_count >= 3`.
     - `LOW` if:
       - `total > 0` and not HIGH/MEDIUM.
     - `NONE` if:
       - `total == 0`.

2. Builds `bullets` summarizing counts:
   - e.g. `"2 critical findings (corrosion / damage / free span)"`.

3. Picks up to 4 “highlights” from `anomaly_log`:
   - e.g. `"- damage at 14:35:50 (51% confidence)"`.

4. Chooses a recommendation string based on risk (predefined text).

5. Composes a base `headline` and `whatsapp_message` (before LLM).

**Important:** The **decision** to send WhatsApp (and whether risk is HIGH/MEDIUM/LOW/NONE) is always made by this rule-based agent, not by the LLM.

### 3.4 When WhatsApp is sent (agent’s action)

WhatsApp is sent only when:

- There is at least one anomaly (`summary.total > 0`),
- `risk_level` is **MEDIUM** or **HIGH** (LOW/NONE → no alert),
- A phone number is present,
- Twilio is configured correctly and accepts the number.

Code-wise:

```python
if body.send_whatsapp and body.phone and risk_level in {"MEDIUM", "HIGH"}:
    sent, info = send_whatsapp_alert(body.phone, whatsapp_message)
    whatsapp_result = {"attempted": True, "sent": sent, "info": info}
else:
    whatsapp_result = {..., "sent": False, ...}
```

So you can say:

> “The agent runs automatically after each mission. If it sees a medium or high‑risk mission and the operator’s phone is configured, it triggers a WhatsApp alert with the key findings and recommended actions. Low‑risk missions are recorded but don’t notify by default.”

---

## 4. WhatsApp integration – step by step

### 4.1 Tech – Twilio Sandbox for WhatsApp

For development/demo we use **Twilio’s WhatsApp Sandbox**:

- Sandbox number (e.g. `+1 415 523 8886`).
- Only numbers that send `join <code>` to this sandbox number can receive messages from it.

Env vars in `.env` (backend root):

```env
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

Backend helper:

- `get_twilio_client()` – builds Twilio client from env vars.
- `send_whatsapp_alert(phone, body)`:
  - Converts `phone` to `whatsapp:+<number>` if needed.
  - Calls `client.messages.create(from_=from_number, to=to, body=body)`.
  - Returns `(True, sid)` or `(False, error)`.

### 4.2 User flow for alerts

1. **Operator joins sandbox** once:
   - In WhatsApp, message `join <code>` to the Twilio sandbox number.

2. **Operator signs up in the app**:
   - Uses the same phone in `+<country><number>` format, e.g. `+918555812616`.

3. **Operator runs a mission** (image or video).

4. **Agent triages mission**:
   - If MEDIUM/HIGH risk:
     - Composes a WhatsApp message (possibly LLM-enhanced).
     - Calls Twilio to send it.

5. **Operator receives alert** on WhatsApp:
   - With mission name, vessel, location, key findings, and recommendation.

This is all **automatic** once they click “Run detection”; there is no longer a separate “Send alert” button.

---

## 5. LLM integration – Gemini as a language layer

### 5.1 Role of the LLM

The LLM (Google Gemini 2.5 Flash) is **not** making safety-critical decisions. It’s only:

- Rewriting:
  - `headline`,
  - `bullets`,
  - `recommendations`,
  - `whatsapp_message`,
- To make them more natural, concise, and operator‑friendly.

The rule-based agent still decides:

- Risk level,
- Whether to alert,
- And which anomalies to highlight.

### 5.2 How we call Gemini

Env var:

```env
GEMINI_API_KEY=...
```

Helper: `call_gemini_mission_agent(...)`:

- Builds a `system_prompt` explaining:
  - Context (NautiCAI, underwater missions),
  - Desired JSON keys,
  - And detailed WhatsApp message structure (greeting, mission info, counts, bullets, recommendation).
- Builds a `user_prompt` that includes the full mission JSON (risk, det_counts, summary, etc.).
- Calls:

```http
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=GEMINI_API_KEY
```

with `responseMimeType: "application/json"`.

- Attempts to parse the returned JSON:
  - If parsing fails, we fall back to the heuristic text → `llm_used = False`.
  - If parsing succeeds:
    - We overwrite `headline`, `bullets`, `recommendations`, `whatsapp_message`.
    - Set `llm_used = True`, store `llm_raw` for debugging.

### 5.3 What the frontend shows

In the Mission Report panel:

- A badge shows:
  - `WHATSAPP SENT` or `WHATSAPP NOT SENT`.
  - If `llm_used` is true: **“LLM ENHANCED”**.

This gives you a clear story to tell:

> “We kept the agent deterministic and safe by using rules for risk and notification, and added Gemini as a language layer on top so that operators get a concise, human-friendly WhatsApp message and mission summary.”

---

## 6. How to run everything (summary)

### Backend (FastAPI)

From `NauticAi/`:

```bash
pip install -r requirements.txt
python -m uvicorn main_api:app --reload --host 0.0.0.0 --port 8000
```

`.env` (backend root) should contain:

```env
TWILIO_ACCOUNT_SID=...             # optional, for WhatsApp
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

GEMINI_API_KEY=...                 # for LLM-enhanced summaries
```

### Frontend (Next.js)

From `NauticAi/frontend`:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 7. What to emphasize in the interview

1. **You respected the constraint**: you did not touch or retrain the model; you built everything **around** it.
2. **You modernized the frontend** with:
   - Production UI, clean navigation, responsive design.
   - Rich detection console with image/video support and PDF reports.
3. **You implemented an agentic layer** that:
   - Automatically runs after each mission,
   - Classifies risk with clear rules,
   - Cleans the mission log based on user edits,
   - Triggers WhatsApp alerts only when it matters.
4. **You integrated a real comms channel** (Twilio WhatsApp) and handled sandbox constraints.
5. **You added an LLM in a controlled way**:
   - As a language/co-pilot, not the decision-maker.
   - Using structured JSON in/out, with graceful fallback when the LLM is unavailable.

If you walk through these points calmly, you’ll be able to explain the system end‑to‑end without needing to talk about training, loss functions, or dataset details. The focus is your **system design, frontend, and agentic/communication layer**. 

