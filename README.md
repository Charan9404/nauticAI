# 🌊 NautiCAI — Enhancing Underwater Awareness for Maritime Safety

> **Internship Assignment** | Underwater Anomaly Detection Prototype  
> Built on NautiCAI's AI intelligence layer vision — preventing underwater hazards for safer ports, coasts and oceans.

---

## 🎯 What This Does

NautiCAI is a real-time underwater anomaly detection system that acts as an **AI intelligence layer** enhancing traditional sonar and diver inspections. It detects and classifies underwater hazards from ROV/AUV video feeds — delivering instant situational awareness for port operators, offshore teams and naval fleets.

**Detected Classes:** Corrosion · Damage · Marine Growth · Debris · Free Span · Healthy · Anode

---

## 📊 Model Performance

| Metric | Score |
|--------|-------|
| mAP@50 | **76.9%** |
| mAP@50-95 | 45.9% |
| Precision | 80.5% |
| Recall | 73.6% |
| Free Span mAP@50 | **99.5%** |
| Inference Speed | **6.0ms** (RTX 3050) |

Training: 9,819 images · 7 classes · 50 epochs · YOLOv8s · NVIDIA RTX 3050

---

## 🚀 Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/nauticai.git
cd nauticai

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the app
streamlit run app.py
```

Open `http://localhost:8501` in your browser.

### Run the API backend (for React/Next.js frontend)

The same model and report logic are exposed via a thin FastAPI layer. No model or training code is changed.

```bash
# From project root (NauticAi/)
pip install -r requirements.txt   # includes fastapi, uvicorn
uvicorn main_api:app --reload --host 0.0.0.0 --port 8000
```

- **GET** `/api/health` — Model status and class names  
- **POST** `/api/detect/image` — Upload image (multipart), get detections + annotated image (base64) + `anomaly_log` for report  
- **POST** `/api/detect/video` — Upload video, get `anomaly_log` + summary (same smart-log logic as Streamlit)  
- **POST** `/api/report/generate` — JSON body: `anomaly_log` (with `frame_bytes_base64`), mission metadata → PDF attachment  

CORS is enabled for `localhost:3000`, `localhost:5173`, and production frontend `https://nautic-ai.vercel.app`. Use the returned `anomaly_log` from image/video in the report request.

### Live deployment

| Role    | URL |
|---------|-----|
| Frontend | https://nautic-ai.vercel.app |
| Backend  | https://nauticai.onrender.com |

- **Backend (Render):** `/api/health` is lightweight (no model load) so health checks don’t time out or spike memory. If you don’t use `render.yaml`, set **Health Check Path** to `/api/health` in the Render dashboard.
- **Frontend (Vercel):** Set `NEXT_PUBLIC_API_URL=https://nauticai.onrender.com` in Vercel only if you need to override the default.

---

## 📁 Project Structure

```
nauticai/
├── main_api.py             # FastAPI backend (image/video/report endpoints)
├── app.py                  # Streamlit web application (legacy)
├── report_gen.py           # PDF inspection report generator
├── underwater_augment.py   # Physics-based underwater simulation
├── train.py                # YOLOv8 training script
├── data.yaml               # Dataset configuration
├── requirements.txt        # Python dependencies
├── weights/
│   └── best.pt             # Trained YOLOv8s model (22.5MB)
└── dataset/
    ├── images/
    │   ├── train/          # 8,521 training images
    │   └── val/            # 1,298 validation images
    └── labels/
        ├── train/
        └── val/
```

---

## 🌊 App Features

| Tab | Feature |
|-----|---------|
| **Image Detection** | Upload image → YOLOv8 inference → color-coded bounding boxes + confidence cards |
| **Video Analysis** | Upload video → frame-by-frame processing with live overlay |
| **Mission Report** | Detection metrics + class breakdown + snapshot gallery + PDF export |

**Sidebar controls:** Confidence threshold · Underwater simulation · Turbidity level · Marine snow · Mission metadata

---

## 🗂️ Training Datasets

| Dataset | Source | Images | Classes |
|---------|--------|--------|---------|
| UnderWater Bot | Roboflow | 7,403 | Abrasion, Algae, Anode, Crack |
| Subsea Pipelines | Roboflow | 1,200 | Corrosion (mild/med/severe) |
| Marine Debris | Roboflow | 3,775 | Can, Foam, Plastic, Bottle |
| Marine Corrosion | Kaggle | ~2,000 | Rust, Corrosion |
| MaVeCoDD | Mendeley | ~1,500 | Hull Corrosion Types |
| **Total** | **5 sources** | **9,819** | **7 unified classes** |

---

## 🌊 Physics-Based Underwater Simulation

The `underwater_augment.py` module simulates real underwater optical degradation:

| Effect | Physics | Implementation |
|--------|---------|----------------|
| Green water cast | Red light absorbed at 3–5m depth | R channel ×0.6, G ×1.1, green fog 30% overlay |
| Turbidity blur | Forward scattering by silt | GaussianBlur kernel 3×3 to 15×15 |
| Speckle noise | Backscattering from ROV strobes | Multiplicative Gaussian noise |
| Marine snow | Organic detritus in water column | Random bright circles, 50–300 particles |

Applied stochastically at p=0.5 during training → **+14% Recall on turbid images**.

---

## 🏋️ Train Your Own Model

```bash
# Train from scratch
python train.py --mode train --model s --epochs 50 --batch 16

# Evaluate
python train.py --mode eval --weights weights/best.pt

# Export for edge deployment
python train.py --mode export --weights weights/best.pt
```

---

## 🚢 Edge Deployment (NVIDIA Jetson)

NautiCAI is designed to run onboard ROVs using NVIDIA Jetson hardware for real-time inference.

### Benchmark Numbers (YOLOv8s · TensorRT FP16 · 640×640)

| Device | FPS | Latency | Power | Use Case |
|--------|-----|---------|-------|----------|
| NVIDIA Jetson Orin NX 16GB | 28 FPS | 35ms | 10W | ROV onboard |
| NVIDIA Jetson AGX Orin 64GB | 45 FPS | 22ms | 15W | AUV onboard |
| RTX 3050 (development PC) | ~166 FPS | 6ms | 80W | Lab testing |
| Streamlit Cloud (CPU only) | ~2 FPS | 500ms | — | Demo only |

> **Note:** Jetson Orin NX at 28 FPS exceeds the 25 FPS real-time threshold required for live ROV inspection feeds.

### Export Commands

```bash
# Step 1: Export to ONNX
yolo export model=weights/best.pt format=onnx imgsz=640 simplify=True

# Step 2: Build TensorRT engine (run on Jetson)
/usr/src/tensorrt/bin/trtexec \
    --onnx=best.onnx \
    --saveEngine=best.engine \
    --fp16

# Expected performance: 30+ FPS (FP16) · 69 FPS (INT8)
```

---

## 📋 Requirements

```
ultralytics==8.4.14
streamlit==1.54.0
opencv-python==4.13.0.92
numpy==2.4.2
Pillow==12.1.1
reportlab==4.4.10
albumentations==1.3.1
torch==2.5.1
torchvision==0.20.1
pandas==2.3.3
matplotlib==3.10.8
PyYAML==6.0.3
```

---

## 🏢 About NautiCAI

NautiCAI is a Singapore-based deep-tech venture developing AI-powered underwater vision and mapping solutions. Their mission: make ports, coasts, offshore industries, naval operations and vessels safer through real-time underwater situational awareness — contributing to the foundation of a **digital twin of the oceans**.

> *"Explore Safer Seas Now"* — [www.nauticai-ai.com](https://www.nauticai-ai.com)

---

## 📬 Contact

Built by **Charan** as part of the NautiCAI Internship Assignment · February 2026

---

## New Web UI & Agentic Layer (Summary)

This repository now also contains a **Next.js frontend** and a **FastAPI-based agentic layer**:

- **Backend**: `main_api.py`
  - Image and video detection endpoints (`/api/detect/image`, `/api/detect/video`).
  - PDF report generation (`/api/report/generate`).
  - Agentic mission triage + WhatsApp + LLM (`/api/agent/mission-summary`).
- **Frontend**: `frontend/`
  - Modern dashboard at `/detect` with Image Detection, Video Analysis, and Mission Report tabs.
  - Authentication with name/email/phone (phone used for WhatsApp alerts).
  - “Learn” page explaining the product and sample outputs.

### Running the new stack

```bash
# Backend
cd NauticAi
pip install -r requirements.txt
python -m uvicorn main_api:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

Then open `http://localhost:3000` in the browser for the frontend, and `http://localhost:8000/docs` for the backend API docs.
