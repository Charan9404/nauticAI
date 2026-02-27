# NautiCAI Backend - Google Cloud Run
# FastAPI + YOLOv8 Underwater Anomaly Detection

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OpenCV and other packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main_api.py .
COPY report_gen.py .
COPY data.yaml .

# Copy model weights
COPY weights/ ./weights/
COPY yolov8n.pt .
COPY yolov8s.pt .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Expose port (Cloud Run uses 8080 by default)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/api/health')" || exit 1

# Start the application
CMD ["sh", "-c", "uvicorn main_api:app --host 0.0.0.0 --port ${PORT}"]
