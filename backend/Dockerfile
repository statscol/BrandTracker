FROM python:3.13-slim

WORKDIR /app

# Install system dependencies (ffmpeg is critical for opencv/audio)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv via pip
RUN pip install uv

COPY requirements.txt .

# Install dependencies using uv
RUN uv pip install --system -r requirements.txt

# Copy backend code
COPY . backend/

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
