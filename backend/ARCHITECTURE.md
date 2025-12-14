# ARC Backend - Complete Architecture

## Overview

The ARC backend is a fully asynchronous video processing pipeline using Google Cloud Platform services.

## Architecture Flow

```
Mobile App → API Server → Cloud Storage → Cloud Tasks → CV Processing → Gemini AI → Results
```

### Detailed Flow:

1. **Mobile App** records basketball shot video
2. **POST /v1/analysis** creates job, returns signed upload URL
3. **Mobile App** uploads video directly to **Google Cloud Storage**
4. **Cloud Task** is enqueued to process the video
5. **Worker** downloads video, processes with Gemini
6. **Results** saved to Firestore
7. **Mobile App** polls **GET /v1/analysis/:id** until complete
8. **Mobile App** fetches results with **GET /v1/analysis/:id/result**

## Tech Stack

- **API Server**: Express + TypeScript on Cloud Run
- **Storage**: Google Cloud Storage (videos)
- **Database**: Firestore (jobs, users, sessions)
- **Queue**: Cloud Tasks (async processing)
- **AI**: Gemini 2.0 Flash (video analysis)
- **CV**: MediaPipe (future - pose estimation)

## API Endpoints

### Public API (Mobile App)

#### `POST /v1/analysis`
Creates a new analysis job.

**Request:**
```json
{
  "angleHint": "side",
  "clientMetadata": {
    "device": "iPhone 15 Pro",
    "appVersion": "1.0.0"
  }
}
```

**Headers:**
- `X-Device-ID`: Required for all requests

**Response:**
```json
{
  "analysisId": "uuid",
  "uploadUrl": "https://storage.googleapis.com/...",
  "status": "queued"
}
```

**Flow:**
1. Checks entitlements (pro status or free analyses)
2. Generates signed URL for video upload (valid 1 hour)
3. Creates job in Firestore
4. Enqueues Cloud Task for processing
5. Returns upload URL to mobile app

#### `GET /v1/analysis/:id`
Get analysis status.

**Response:**
```json
{
  "status": "processing",
  "progressStage": "llm",
  "error": null
}
```

**Status values:**
- `queued` - Job created, waiting for video upload
- `processing` - Video is being analyzed
- `complete` - Analysis finished, results ready
- `failed` - Analysis failed

**Progress stages:**
- `uploading` - Mobile app uploading video
- `extracting_frames` - Extracting key frames
- `pose` - Running pose estimation
- `llm` - Gemini analyzing form
- `saving` - Saving results

#### `GET /v1/analysis/:id/result`
Get analysis results (only when status is `complete`).

**Response:**
```json
{
  "coachSummary": "Focus on keeping your elbow in. Your shot line is drifting right.",
  "primaryFocus": "Elbow alignment",
  "whyItMatters": "A straight elbow path gives you consistent release and better accuracy.",
  "drillRecommendation": "Practice 50 form shots focusing only on elbow position. Use a mirror or record yourself from the side.",
  "correctionCategory": "shotline_elbow",
  "sessionId": "uuid",
  "priorReferenceText": "You've been working on this for 3 sessions..."
}
```

**Correction Categories (Priority Order):**
1. `balance_verticality` - Balance and vertical jump issues
2. `shotline_elbow` - Shot line integrity (elbow + ball path)
3. `setpoint_consistency` - Set point consistency
4. `release_followthrough` - Release and follow-through

#### `GET /v1/entitlements`
Get user entitlements.

**Response:**
```json
{
  "isPro": false,
  "remainingFreeAnalyses": 2
}
```

#### `GET /v1/sessions?limit=50`
Get session history.

**Response:**
```json
[
  {
    "sessionId": "uuid",
    "date": "2025-01-01T12:00:00Z",
    "primaryFocus": "Elbow alignment",
    "correctionCategory": "shotline_elbow",
    "improvementNote": "More consistent than last session"
  }
]
```

### Internal API (Cloud Tasks)

#### `POST /internal/process-analysis`
Triggered by Cloud Tasks to process uploaded video.

**Request:**
```json
{
  "analysisId": "uuid",
  "videoPath": "videos/uuid/video.mp4",
  "angleHint": "side",
  "deviceId": "device-uuid",
  "userId": "user-uuid"
}
```

**Processing Steps:**
1. Download video from GCS
2. Extract frames (future: FFmpeg)
3. Run pose estimation (future: MediaPipe)
4. Analyze with Gemini AI
5. Save results to Firestore
6. Update job status to `complete`

## Services

### Storage Service (`services/storage.ts`)
- Generate signed upload URLs
- Download videos for processing
- Manage video lifecycle

### Firestore Service (`services/firestore.ts`)
- Analysis job tracking
- User data & entitlements
- Session history

### Queue Service (`services/queue.ts`)
- Enqueue Cloud Tasks
- Process analysis jobs asynchronously

### Gemini Service (`services/coaching/gemini.ts`)
- Video analysis with Gemini 2.0 Flash
- Coaching feedback generation
- Session metrics analysis

## Database Schema

### Collections

#### `analyses`
```typescript
{
  analysisId: string;
  userId?: string;
  deviceId: string;
  status: "queued" | "processing" | "complete" | "failed";
  progressStage?: string;
  videoPath: string;
  angleHint?: "side" | "front";
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Results (when complete)
  coachSummary?: string;
  primaryFocus?: string;
  whyItMatters?: string;
  drillRecommendation?: string;
  correctionCategory?: string;
  priorReferenceText?: string;
  error?: string;
}
```

#### `users`
```typescript
{
  deviceId: string;
  userId?: string;
  isPro: boolean;
  freeAnalysesUsed: number;
  freeAnalysesLimit: number;
  createdAt: Timestamp;
  lastAnalysisAt?: Timestamp;
}
```

#### `sessions`
```typescript
{
  sessionId: string;
  userId?: string;
  deviceId: string;
  date: Timestamp;
  primaryFocus: string;
  correctionCategory: string;
  improvementNote?: string;
  videoPath: string;
}
```

## Coaching AI Prompt

The Gemini AI uses a carefully crafted coaching prompt that:

1. **Enforces Priority Order**: Only one correction, following strict priority rules
2. **Uses Coaching Language**: Plain, human coaching language (no jargon)
3. **Provides Continuity**: References previous sessions and focus areas
4. **Returns Structured Output**: JSON format for consistent parsing

### Correction Priority (Hard Rules):
1. Balance & verticality (if unstable, everything else is pointless)
2. Shot line integrity (elbow + ball path alignment)
3. Set point consistency (release point repeatability)
4. Release & follow-through (finishing the shot)

### Suppression Rules:
- Never give multiple corrections
- Never use "also" or "another thing"
- Ignore minor aesthetic deviations
- Repeat same correction until improvement visible

## Environment Variables

```bash
# Server
PORT=8080
NODE_ENV=production

# Google Cloud
GCP_PROJECT_ID=arc-basketball-app
GCP_REGION=us-central1

# Storage
GCS_BUCKET_NAME=arc-videos
GCS_SIGNED_URL_EXPIRY=3600

# Gemini
GEMINI_API_KEY=your_key_here

# Cloud Tasks
CLOUD_TASKS_QUEUE_NAME=arc-analysis-queue
CLOUD_TASKS_LOCATION=us-central1
CLOUD_RUN_SERVICE_URL=https://arc-api-xxxxx.run.app

# Firebase (optional - for auth)
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
```

## Deployment

### Build & Deploy
```bash
cd backend

# Deploy to Cloud Run
gcloud run deploy arc-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT_ID=arc-basketball-app \
  --set-env-vars GCS_BUCKET_NAME=arc-videos \
  --set-env-vars GEMINI_API_KEY=your_key \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300
```

### Get Service URL
After deployment, set this in your environment:
```bash
export CLOUD_RUN_SERVICE_URL=https://arc-api-xxxxx.run.app
```

And update your mobile app:
```bash
# In mobile app .env
EXPO_PUBLIC_API_BASE_URL=https://arc-api-xxxxx.run.app
EXPO_PUBLIC_USE_BACKEND_API=true
```

## Monitoring

### Cloud Run Logs
```bash
gcloud run services logs read arc-api --region us-central1
```

### Firestore Console
https://console.cloud.google.com/firestore

### Cloud Storage Console
https://console.cloud.google.com/storage

### Cloud Tasks Console
https://console.cloud.google.com/cloudtasks

## Cost Optimization

- **Cloud Run**: Pay per request, scales to zero
- **Cloud Storage**: ~$0.02/GB/month
- **Firestore**: First 50K reads/day free
- **Cloud Tasks**: First 1M tasks/month free
- **Gemini API**: ~$0.01 per video analysis

**Estimated cost for 1000 analyses/month**: ~$20-30

## Future Enhancements

1. **MediaPipe Integration**: Add pose estimation for detailed form analysis
2. **FFmpeg Processing**: Extract key frames from video
3. **Ball Tracking**: Implement for session analysis
4. **Caching**: Cache similar analyses
5. **Rate Limiting**: Prevent abuse
6. **Analytics**: Track usage patterns
7. **A/B Testing**: Test different coaching prompts

## Security

- Device ID based authentication (anonymous users)
- Firebase Auth ready for logged-in users
- Signed URLs with 1-hour expiry
- Request validation with Zod
- Ownership verification on all endpoints
- CORS configured for mobile app
- Helmet security headers

## Troubleshooting

### "Video processing failed"
- Check Gemini API key is valid
- Verify video file exists in GCS
- Check Cloud Run logs for details

### "Task enqueue failed"
- Verify Cloud Tasks queue exists
- Check service account permissions
- Ensure CLOUD_RUN_SERVICE_URL is set

### "Analysis stuck in processing"
- Check Cloud Run logs
- Verify task was created
- Look for errors in Firestore

## Testing

### Local Testing
```bash
# Start dev server
bun run dev

# Test health endpoint
curl http://localhost:8080/health

# Test create analysis
curl -X POST http://localhost:8080/v1/analysis \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: test-device" \
  -d '{"angleHint": "side"}'
```

### Production Testing
Use the mobile app or Postman to test the full flow.
