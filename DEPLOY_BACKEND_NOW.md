# 🚨 URGENT: Backend Deployment Required

## The Problem

The app is calling `/v1/analysis/{id}/start` but the backend returns **404 - Endpoint not found**.

**Root Cause:** The backend code has this endpoint (see `backend/src/routes/analysis.ts` line 109), but **the deployed backend is running OLD code** without this endpoint.

## Evidence

From your logs:
```
LOG  [backend-api] POST https://arc-api-564361317418.us-central1.run.app/v1/analysis/320705b4-5ea0-433c-86c8-44d4c055b342/start
LOG  [backend-api] Response status: 404
LOG  [backend-api] API Error: 404 {"code": "NOT_FOUND", "message": "Endpoint not found"}
```

The video upload succeeds (status 201), but starting the analysis fails because the `/start` endpoint doesn't exist in the deployed version.

## Solution

**Deploy the backend to Google Cloud Run.** The code is ready, it just needs to be deployed.

---

## Option 1: Deploy via Cloud Console (GUI) - RECOMMENDED

### Step 1: Download the Deployment Package

From your Vibecode environment, download the file:
```
/home/user/workspace/backend-deployment-latest.tar.gz
```

This contains all the backend code ready to deploy.

### Step 2: Upload to Google Cloud Run

1. Go to [Google Cloud Console - Cloud Run](https://console.cloud.google.com/run)
2. Select project: `arc-ai-481122`
3. Find the service: `arc-api` (or create new if it doesn't exist)
4. Click **"EDIT & DEPLOY NEW REVISION"**
5. Under "Container image URL", click **"DEPLOY ONE REVISION FROM A SOURCE"**
6. Choose **"Source Code"**
7. Click **"SELECT"** → **"UPLOAD FILES"**
8. Upload the `backend-deployment-latest.tar.gz` file
9. Set build environment:
   - **Build type:** Buildpack
   - **Entry point:** Detected automatically
10. Set environment variables:
    ```
    GEMINI_API_KEY=<your-gemini-api-key>
    GOOGLE_CLOUD_PROJECT=arc-ai-481122
    GCS_BUCKET_NAME=arc-videos-arc-ai-481122
    ```
11. Click **"DEPLOY"**

### Step 3: Wait for Deployment (3-5 minutes)

The service will build and deploy. You'll see a green checkmark when ready.

### Step 4: Test the Endpoint

After deployment, test if the endpoint exists:
```bash
curl https://arc-api-564361317418.us-central1.run.app/health
```

You should see: `{"status":"ok","timestamp":"...","version":"1.0.0"}`

Then test the new endpoint (it will fail with auth error, but that's OK - it means it exists):
```bash
curl -X POST https://arc-api-564361317418.us-central1.run.app/v1/analysis/test-id/start
```

You should see: `{"code":"UNAUTHORIZED","message":"Device ID required"}` (NOT "Endpoint not found")

---

## Option 2: Deploy via Command Line (Local Machine)

**IMPORTANT:** This MUST be run from your local machine, NOT the Vibecode sandbox.

### Step 1: Install Google Cloud SDK (if not already installed)

```bash
# macOS
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

### Step 2: Authenticate

```bash
gcloud auth login
gcloud config set project arc-ai-481122
```

### Step 3: Download Backend Code

Download `/home/user/workspace/backend/` folder from Vibecode to your local machine.

### Step 4: Deploy

```bash
cd backend
export GEMINI_API_KEY=your_actual_key_here
./deploy.sh
```

The `deploy.sh` script will:
- Build the Docker image
- Push to Google Container Registry
- Deploy to Cloud Run
- Set environment variables

### Step 5: Verify

```bash
gcloud run services describe arc-api --region us-central1 --platform managed
```

---

## After Deployment

### Test the App

1. Open the Vibecode app
2. Record a new video
3. Start analysis

**Expected logs:**
```
LOG  [backend-api] POST https://arc-api-564361317418.us-central1.run.app/v1/analysis/{id}/start
LOG  [backend-api] Response status: 200  ← Should be 200, not 404!
```

### Check Backend Logs

Go to [Cloud Run Logs](https://console.cloud.google.com/run/detail/us-central1/arc-api/logs?project=arc-ai-481122) and you should see:
```
[analysis] Analysis 320705b4-... started processing
[analysis] Extracting frames from video...
[analysis] Running pose estimation...
```

---

## What This Deployment Fixes

✅ `/v1/analysis/:id/start` endpoint (start analysis after upload)
✅ `/v1/purchases/sync` endpoint (sync RevenueCat purchases)
✅ `/webhooks/revenuecat` endpoint (automatic purchase sync)
✅ Auth token support (proper user identification)
✅ Updated Pro status check logic
✅ Free analysis limit (1 instead of 2)

---

## Current Deployment Status

| Component | Status | Next Step |
|-----------|--------|-----------|
| Frontend Auth Fix | ✅ Done | User must re-login |
| Backend Code | ✅ Ready | **DEPLOY NOW** |
| Backend Deployed | ❌ Pending | **YOU - Deploy via Cloud Console** |
| RevenueCat Webhook | ⏸️ Waiting | Configure after backend deploy |

---

## Why This is Urgent

Every analysis attempt is failing with "Endpoint not found" because the deployed backend doesn't have the `/start` endpoint. The fix is already written - it just needs to be deployed.

**Estimated Time:** 5-10 minutes via Cloud Console

---

## Need Help?

If deployment fails, check:
1. ✅ Project ID is `arc-ai-481122`
2. ✅ Service name is `arc-api`
3. ✅ Region is `us-central1`
4. ✅ GEMINI_API_KEY is set correctly
5. ✅ GCS bucket `arc-videos-arc-ai-481122` exists

If the GCS bucket doesn't exist, create it:
```bash
gcloud storage buckets create gs://arc-videos-arc-ai-481122 --location=us-central1
```

---

## Questions?

- **"Will this break anything?"** - No, it's a drop-in replacement with new endpoints added.
- **"Do I need to update the app?"** - No, the app is already calling the new endpoints.
- **"What about existing users?"** - They need to re-login to get auth tokens saved.
- **"How long will it take?"** - 5-10 minutes via Cloud Console, 3-5 minutes via CLI.

**Action Required:** Deploy the backend via Cloud Console using the `backend-deployment-latest.tar.gz` file.
