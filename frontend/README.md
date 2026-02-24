# NautiCAI Web — Detection Console

Production-style UI for underwater anomaly detection (image/video upload, YOLOv8 results, PDF report).

## Run the app

```bash
npm install
npm run dev
```

Open **http://localhost:3000**. Sign in or sign up, then use **Explore the model** (or go to `/detect`).

## Make detection work (backend required)

The detection console talks to the **Python FastAPI backend**. Without it, upload and "Run detection" will fail.

### 1. Start the backend

From the **project root** (e.g. `NauticAi/`, not `frontend/`):

```bash
cd path/to/NauticAi
pip install -r requirements.txt
uvicorn main_api:app --reload --host 0.0.0.0 --port 8000
```

Leave this running. The API serves at **http://localhost:8000**.

### 2. Optional: different API URL

If the backend runs on another host/port, set:

```bash
# .env.local in frontend/
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Use the console

- **Image Detection:** Upload JPEG/PNG/WebP → set confidence (and optional underwater sim) → **Run detection**. Annotated image and detection cards appear; data is merged into the session for the report.
- **Video Analysis:** Upload MP4/AVI/MOV → set frame skip & max frames → **Run video analysis**. After processing, you’re taken to Mission Report with merged results.
- **Mission Report:** Review metrics, breakdown, timeline, snapshots; edit mission details → **Generate PDF report** to download. **Reset session** clears all detections.

All detection and report generation goes through the FastAPI backend; the frontend only sends requests and displays responses.
