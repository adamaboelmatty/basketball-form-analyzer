# ARC Backend API

Node.js + Express backend for the ARC Basketball Coaching App with complete CV pipeline.

## Architecture

- **API Server**: Express.js with TypeScript
- **Storage**: Google Cloud Storage for video files
- **Database**: Firestore for job status and user data
- **Queue**: Cloud Tasks for async CV processing
- **AI**: Gemini 2.0 Flash for coaching analysis
- **CV Pipeline**:
  - **FFmpeg**: Frame extraction from video
  - **MediaPipe**: Pose estimation for body mechanics
  - **OpenCV**: Ball tracking and trajectory analysis

## Complete CV Processing Pipeline

### Shot Analysis Flow

1. **Video Upload** → Client uploads to GCS via signed URL
2. **Frame Extraction** → FFmpeg extracts key frames (15fps, first 5 seconds)
3. **Pose Estimation** → MediaPipe detects body keypoints
4. **Pose Analysis** → Calculate shooting metrics:
   - Elbow angle at release
   - Knee flexion at set point
   - Shoulder alignment
   - Release height
5. **AI Coaching** → Gemini analyzes video + pose data
6. **Results** → Prioritized correction with drill

### Session Analysis Flow

1. **Multiple Shots** → Record 5-10 free throws
2. **Rim Calibration** → User marks rim position
3. **Ball Tracking** → OpenCV tracks ball through each shot
4. **Trajectory Analysis** → Calculate for each shot:
   - Arc height and trend
   - Depth tendency (short/long/centered)
   - Left/right tendency
   - Shot make/miss
5. **Session Metrics** → Aggregate across all shots
6. **Coach Bridge** → Gemini suggests focus based on patterns

## API Endpoints

### Analysis
- `POST /v1/analysis` - Create analysis job, get signed upload URL
- `GET /v1/analysis/:id` - Get analysis status
- `GET /v1/analysis/:id/result` - Get analysis results

### Sessions
- `GET /v1/sessions` - Get user session history

### Entitlements
- `GET /v1/entitlements` - Get pro status and free analyses remaining

## Setup

### 1. Install Dependencies
```bash
cd backend
bun install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in:
```bash
cp .env.example .env
```

Required variables:
- `GCP_PROJECT_ID` - Your Google Cloud project ID
- `GCS_BUCKET_NAME` - Cloud Storage bucket for videos
- `GEMINI_API_KEY` - Gemini API key for coaching
- Firebase Admin credentials (service account JSON)

### 3. Set Up Google Cloud

#### Enable APIs
```bash
gcloud services enable storage.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable cloudtasks.googleapis.com
gcloud services enable run.googleapis.com
```

#### Create Storage Bucket
```bash
gsutil mb -l us-central1 gs://arc-videos
```

#### Create Firestore Database
```bash
gcloud firestore databases create --location=us-central1
```

#### Create Cloud Tasks Queue
```bash
gcloud tasks queues create arc-analysis-queue \
  --location=us-central1
```

### 4. Run Locally
```bash
bun run dev
```

Server will start on http://localhost:8080

## Deployment

### Deploy to Cloud Run
```bash
bun run deploy
```

Or manually:
```bash
gcloud run deploy arc-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT_ID=your-project-id \
  --set-env-vars GCS_BUCKET_NAME=arc-videos
```

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Express app entry point
│   ├── middleware/
│   │   ├── auth.ts           # Firebase auth + device ID
│   │   └── errorHandler.ts  # Global error handler
│   ├── routes/
│   │   ├── analysis.ts       # Analysis endpoints
│   │   ├── sessions.ts       # Session history
│   │   └── entitlements.ts  # User entitlements
│   ├── services/
│   │   ├── storage.ts        # GCS video upload
│   │   ├── firestore.ts      # Database operations
│   │   ├── queue.ts          # Cloud Tasks
│   │   ├── cv/
│   │   │   ├── pose.ts       # MediaPipe pose estimation
│   │   │   └── ball.ts       # Ball tracking for sessions
│   │   └── coaching/
│   │       └── gemini.ts     # Gemini coaching analysis
│   └── types/
│       └── index.ts          # Shared types
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Type Checking
```bash
bun run build
```

### Testing
```bash
bun test
```

## Next Steps

1. ✅ Basic API structure
2. ⏳ Implement video upload to GCS
3. ⏳ Implement Firestore job tracking
4. ⏳ Build CV pipeline (pose estimation)
5. ⏳ Integrate Gemini for coaching
6. ⏳ Add Cloud Tasks for async processing
7. ⏳ Deploy to Cloud Run
