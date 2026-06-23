FROM python:3.14-slim

# ffmpeg + ffprobe for video reshaping
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# uv for dependency install
RUN pip install --no-cache-dir uv

WORKDIR /app
COPY . .

# install deps from your uv.lock into the system env
RUN uv sync --frozen --no-dev

EXPOSE 8080
CMD ["sh", "-c", "uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]