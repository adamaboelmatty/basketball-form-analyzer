# Build stage
FROM node:20 AS builder

WORKDIR /app

# Copy package.json
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Install runtime dependencies: FFmpeg, Python, and system libs for MediaPipe/OpenCV
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Create Python virtual environment and install MediaPipe
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies for MediaPipe
RUN pip install --no-cache-dir \
    mediapipe>=0.10.0 \
    opencv-python-headless>=4.8.0 \
    numpy>=1.24.0

# Copy package.json and node_modules from builder
COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy Python scripts (MediaPipe worker)
COPY src/services/cv/mediapipe_worker.py ./dist/services/cv/

# Expose port
EXPOSE 8080

# Set Python path for the MediaPipe worker
ENV PYTHONPATH="/opt/venv/lib/python3.11/site-packages"

# Start the application
CMD ["node", "dist/index.js"]
