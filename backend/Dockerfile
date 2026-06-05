FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Create static directory
RUN mkdir -p static

# Cloud Run sets PORT env var (default 8080)
ENV PORT=8080

# Run with uvicorn
CMD exec uvicorn main:app --host 0.0.0.0 --port $PORT
