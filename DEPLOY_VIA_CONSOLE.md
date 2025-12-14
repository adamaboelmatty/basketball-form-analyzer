# Deploy Backend via Google Cloud Console

## Prerequisites

You'll need:
1. Access to Google Cloud Console
2. Gemini API Key (get from https://aistudio.google.com/app/apikey)

## Step-by-Step Deployment

### 1. Download the Backend Package

The deployment package is ready at: `/home/user/workspace/backend-deployment.tar.gz`

Download this file to your local machine.

### 2. Go to Cloud Run Console

1. Open: https://console.cloud.google.com/run
2. Make sure you're in project: **arc-ai-481122**
3. You should see the existing service: **arc-api**

### 3. Deploy New Revision

Click on **arc-api** service, then click **"EDIT & DEPLOY NEW REVISION"** at the top

### 4. Upload Code

**Container Tab:**
1. Click "Source Code" (instead of container image)
2. Click "Upload"
3. Upload the `backend-deployment.tar.gz` file
4. Build type: **Buildpack**
5. Entry point: Leave as default (will use `npm start`)

OR if "Source Code" option isn't available:

**Alternative - Use Cloud Build:**
1. Extract `backend-deployment.tar.gz` locally
2. Upload to Google Cloud Storage bucket
3. Or use Cloud Build trigger from source

### 5. Configure Settings

**Container Tab:**
- **Memory**: 2 GiB
- **CPU**: 2
- **Request timeout**: 300 seconds
- **Autoscaling**: Min 0, Max 100

### 6. Set Environment Variables

Click **"VARIABLES & SECRETS"** tab and add these environment variables:

```
GCP_PROJECT_ID=arc-ai-481122
GCS_BUCKET_NAME=arc-videos-arc-ai-481122
GEMINI_API_KEY=<your_gemini_api_key>
CLOUD_TASKS_QUEUE_NAME=arc-analysis-queue
CLOUD_TASKS_LOCATION=us-central1
NODE_ENV=production
```

**CRITICAL:** Replace `<your_gemini_api_key>` with your actual Gemini API key

### 7. Configure Permissions

**Security Tab:**
- **Authentication**: Allow unauthenticated invocations (✓)
- **Service Account**: Use default service account

### 8. Deploy

1. Click **"DEPLOY"** at the bottom
2. Wait 3-5 minutes for deployment to complete
3. You'll see the service URL: `https://arc-api-564361317418.us-central1.run.app`

### 9. Verify Deployment

Test the health endpoint:
```bash
curl https://arc-api-564361317418.us-central1.run.app/health
```

Should return:
```json
{"status":"ok","timestamp":"...","version":"1.0.0"}
```

## Alternative: Deploy from GitHub/Source Repository

If you prefer to deploy directly from source:

### Option A: GitHub Repository

1. Push backend code to GitHub repository
2. In Cloud Run console, choose "Deploy from repository"
3. Connect your GitHub repo
4. Set build configuration:
   - Branch: main
   - Build directory: `/backend`
   - Build type: Buildpack

### Option B: Google Cloud Source Repositories

1. Upload code to Google Cloud Source Repositories
2. In Cloud Run console, choose "Deploy from repository"
3. Select Cloud Source Repository
4. Configure build as above

## After Deployment

### 1. Test Purchase Sync Endpoint

```bash
# Should return 404 or authentication error (expected - means endpoint exists)
curl -X POST https://arc-api-564361317418.us-central1.run.app/v1/purchases/sync \
  -H "Content-Type: application/json" \
  -d '{"receiptData":"test"}'
```

### 2. Configure RevenueCat Webhook

1. Go to RevenueCat Dashboard: https://app.revenuecat.com/
2. Navigate to: **Project Settings → Integrations → Webhooks**
3. Click **"Add Webhook"**
4. Configure:
   - **URL**: `https://arc-api-564361317418.us-central1.run.app/webhooks/revenuecat`
   - **Events**:
     - ✅ INITIAL_PURCHASE
     - ✅ RENEWAL
     - ✅ NON_RENEWING_PURCHASE
     - ✅ CANCELLATION
     - ✅ EXPIRATION
5. Click **"Save"**

### 3. Test the App

1. Open app with testplayer@gmail.com
2. Try recording and analyzing a video
3. Check logs in Cloud Run console for any errors

### 4. View Logs

To view deployment and runtime logs:
1. Go to Cloud Run console
2. Click on **arc-api** service
3. Click **"LOGS"** tab

## Environment Variables Explained

- **GCP_PROJECT_ID**: Your Google Cloud project ID
- **GCS_BUCKET_NAME**: Storage bucket for video uploads
- **GEMINI_API_KEY**: Your Gemini API key (required for AI analysis)
- **CLOUD_TASKS_QUEUE_NAME**: Queue for async processing
- **CLOUD_TASKS_LOCATION**: Region for Cloud Tasks
- **NODE_ENV**: Set to 'production' for production deployment

## Troubleshooting

### If deployment fails:
1. Check build logs in Cloud Run console
2. Verify all environment variables are set correctly
3. Ensure service account has necessary permissions

### If health check fails after deployment:
1. Check that port 8080 is being used (default)
2. Review runtime logs for errors
3. Verify environment variables are correct

### If analysis still fails:
1. Test the `/internal/set-pro-status` endpoint:
```bash
curl -X POST https://arc-api-564361317418.us-central1.run.app/internal/set-pro-status \
  -H "Content-Type: application/json" \
  -d '{"email":"testplayer@gmail.com","isPro":true}'
```
2. Check Firestore to verify `isPro: true` was set
3. Review backend logs for detailed error messages

## What Gets Fixed After Deployment

✅ Purchase sync endpoint (`/v1/purchases/sync`) will be active
✅ RevenueCat webhook will automatically update Pro status
✅ Admin endpoint to set Pro status by email
✅ Auth token support for proper user identification
✅ No more "Failed to create analysis job" errors for Pro users

## Files Included in Deployment

- `src/routes/purchases.ts` - Purchase sync endpoint
- `src/routes/webhooks.ts` - RevenueCat webhook handler
- `src/routes/internal.ts` - Admin tools + set-pro-status
- `src/routes/analysis.ts` - Analysis creation endpoint
- `src/routes/entitlements.ts` - Entitlement checks
- `src/routes/sessions.ts` - Session history
- `src/services/*` - Backend services (Firestore, Storage, Queue, CV, AI)
- `src/middleware/*` - Auth and error handling
- `package.json` - Dependencies
- All other backend files

## Summary

1. Download `backend-deployment.tar.gz` from workspace
2. Go to Cloud Run console → arc-api service
3. Click "Edit & Deploy New Revision"
4. Upload the deployment package
5. Set environment variables (especially GEMINI_API_KEY)
6. Deploy and wait 3-5 minutes
7. Configure RevenueCat webhook
8. Test the app

The permanent solution will be active once deployed!
