# ARC Backend Setup Guide

This guide will help you set up and deploy the ARC backend API to Google Cloud.

## Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed and authenticated
- Node.js 18+ installed
- Bun package manager installed

## Step 1: Create Google Cloud Project

```bash
# Set your project ID
export PROJECT_ID="arc-basketball-app"

# Create project
gcloud projects create $PROJECT_ID

# Set as default
gcloud config set project $PROJECT_ID

# Enable billing (required - do this in Cloud Console)
# https://console.cloud.google.com/billing
```

## Step 2: Enable Required APIs

```bash
gcloud services enable \
  storage.googleapis.com \
  firestore.googleapis.com \
  cloudtasks.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com
```

## Step 3: Create Cloud Storage Bucket

```bash
# Create bucket for videos
gsutil mb -l us-central1 gs://arc-videos-$PROJECT_ID

# Set CORS for signed URLs
echo '[
  {
    "origin": ["*"],
    "method": ["GET", "PUT"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]' > cors.json

gsutil cors set cors.json gs://arc-videos-$PROJECT_ID
rm cors.json
```

## Step 4: Create Firestore Database

```bash
# Create Firestore database in native mode
gcloud firestore databases create \
  --location=us-central1 \
  --type=firestore-native
```

## Step 5: Create Cloud Tasks Queue

```bash
# Create queue for async CV processing
gcloud tasks queues create arc-analysis-queue \
  --location=us-central1
```

## Step 6: Get Gemini API Key

1. Go to https://ai.google.dev/
2. Click "Get API Key"
3. Create a new API key for Gemini
4. Save the key - you'll need it for deployment

## Step 7: Create Service Account (Optional - for local dev)

```bash
# Create service account
gcloud iam service-accounts create arc-backend \
  --display-name="ARC Backend Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:arc-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:arc-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:arc-backend@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudtasks.enqueuer"

# Download key for local development
gcloud iam service-accounts keys create serviceAccountKey.json \
  --iam-account=arc-backend@$PROJECT_ID.iam.gserviceaccount.com
```

## Step 8: Configure Environment Variables

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```bash
GCP_PROJECT_ID=arc-basketball-app  # Your project ID
GCS_BUCKET_NAME=arc-videos-arc-basketball-app  # Your bucket name
GEMINI_API_KEY=your_gemini_api_key_here
CLOUD_TASKS_QUEUE_NAME=arc-analysis-queue
CLOUD_TASKS_LOCATION=us-central1
```

## Step 9: Test Locally

```bash
cd backend

# Install dependencies
bun install

# Run dev server
bun run dev
```

Server should start on http://localhost:8080

Test the health endpoint:
```bash
curl http://localhost:8080/health
```

## Step 10: Deploy to Cloud Run

```bash
cd backend

# Deploy (this will build and deploy)
gcloud run deploy arc-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GCP_PROJECT_ID=$PROJECT_ID" \
  --set-env-vars "GCS_BUCKET_NAME=arc-videos-$PROJECT_ID" \
  --set-env-vars "GEMINI_API_KEY=your_gemini_api_key" \
  --set-env-vars "CLOUD_TASKS_QUEUE_NAME=arc-analysis-queue" \
  --set-env-vars "CLOUD_TASKS_LOCATION=us-central1" \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300
```

## Step 11: Get Your API URL

After deployment completes, you'll see:
```
Service URL: https://arc-api-xxxxx-uc.a.run.app
```

Copy this URL and update your mobile app's environment variable:
```bash
# In your mobile app's .env file
EXPO_PUBLIC_API_BASE_URL=https://arc-api-xxxxx-uc.a.run.app
```

## Step 12: Test Deployed API

```bash
# Test health endpoint
curl https://arc-api-xxxxx-uc.a.run.app/health

# Test creating analysis job
curl -X POST https://arc-api-xxxxx-uc.a.run.app/v1/analysis \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: test-device-123" \
  -d '{"angleHint": "side"}'
```

## Monitoring & Logs

### View Logs
```bash
# View Cloud Run logs
gcloud run services logs read arc-api --region us-central1

# View logs in Cloud Console
# https://console.cloud.google.com/run
```

### Monitor Performance
- Go to Cloud Console → Cloud Run → arc-api
- View metrics, requests, and errors

## Cost Estimates

With typical usage:
- **Cloud Run**: ~$10-30/month (generous free tier)
- **Cloud Storage**: ~$1-5/month for 100GB
- **Firestore**: ~$1-10/month for 1M reads
- **Cloud Tasks**: Free tier covers most usage
- **Gemini API**: Pay per request (~$0.01 per analysis)

**Total estimated cost**: $20-50/month for moderate usage

## Troubleshooting

### "Permission Denied" errors
- Ensure service account has correct IAM roles
- Check Cloud Run service identity has Storage and Firestore access

### "Bucket not found"
- Verify bucket name in environment variables
- Ensure bucket exists: `gsutil ls`

### "Firestore database not found"
- Ensure Firestore database is created in native mode
- Check project ID is correct

### "Gemini API errors"
- Verify API key is correct
- Check Gemini API is enabled for your project
- Ensure you have credits/billing enabled

## Next Steps

Now that your backend is deployed:

1. ✅ Update mobile app with your API URL
2. ⏳ Implement CV processing pipeline (MediaPipe + Gemini)
3. ⏳ Set up Cloud Tasks worker for async processing
4. ⏳ Add monitoring and alerting
5. ⏳ Configure custom domain (optional)

## Security Notes

- Never commit `.env` or `serviceAccountKey.json` to git
- Use Secret Manager for production secrets
- Enable Cloud Run authentication for production
- Set up API rate limiting
- Monitor for abuse

## Support

For issues:
1. Check Cloud Run logs first
2. Verify all GCP services are enabled
3. Ensure environment variables are set correctly
4. Check IAM permissions
