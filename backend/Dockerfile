FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for OpenCV and yt-dlp
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code into /app/backend to match python module structure
# This allows 'uvicorn backend.main:app' to work correctly from /app
COPY . backend/

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
