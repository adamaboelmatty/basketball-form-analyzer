#!/bin/bash
# ARC Backend Deployment Script

set -e

echo "🚀 Deploying ARC Backend to Google Cloud Run..."
echo ""

# Check for GEMINI_API_KEY environment variable
if [ -z "$GEMINI_API_KEY" ]; then
  echo "⚠️  GEMINI_API_KEY not set in environment"
  echo ""
  echo "Please set it with:"
  echo "  export GEMINI_API_KEY=your_api_key_here"
  echo ""
  echo "Or provide it in the deploy command below"
  exit 1
fi

echo "📦 Project: arc-ai-481122"
echo "🌍 Region: us-central1"
echo "🪣 Bucket: arc-videos-arc-ai-481122"
echo ""

# Deploy to Cloud Run
gcloud run deploy arc-api \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GCP_PROJECT_ID=arc-ai-481122" \
  --set-env-vars "GCS_BUCKET_NAME=arc-videos-arc-ai-481122" \
  --set-env-vars "GEMINI_API_KEY=$GEMINI_API_KEY" \
  --set-env-vars "CLOUD_TASKS_QUEUE_NAME=arc-analysis-queue" \
  --set-env-vars "CLOUD_TASKS_LOCATION=us-central1" \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Test your API:"
echo "  curl https://arc-api-564361317418.us-central1.run.app/health"
echo ""
echo "View logs:"
echo "  gcloud run services logs read arc-api --region us-central1"
