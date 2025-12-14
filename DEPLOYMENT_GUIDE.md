# PERMANENT SOLUTION - Deployment Guide

## Problem Summary

The backend was not deployed with the latest changes, causing:
1. Purchase sync endpoint missing (`/v1/purchases/sync`)
2. Pro status not syncing from RevenueCat to Firestore
3. Users hitting paywall even with Pro purchases

## Solution: Deploy Updated Backend

### Prerequisites

1. **Google Cloud CLI installed**
   ```bash
   # Install gcloud CLI if not already installed
   # Visit: https://cloud.google.com/sdk/docs/install
   ```

2. **Gemini API Key**
   - Get from: https://aistudio.google.com/app/apikey
   - Or use existing key

### Deployment Steps

#### 1. Deploy Backend to Cloud Run

```bash
# Navigate to backend directory
cd /home/user/workspace/backend

# Set Gemini API key
export GEMINI_API_KEY=your_gemini_api_key_here

# Deploy
./deploy.sh
```

This will deploy to: `https://arc-api-564361317418.us-central1.run.app`

#### 2. Configure RevenueCat Webhook (CRITICAL for automatic sync)

After deployment, configure RevenueCat to automatically sync purchases:

1. Go to RevenueCat Dashboard: https://app.revenuecat.com/
2. Select your project
3. Navigate to: **Project Settings → Integrations → Webhooks**
4. Click "Add Webhook"
5. Configure:
   - **URL**: `https://arc-api-564361317418.us-central1.run.app/webhooks/revenuecat`
   - **Events to send**:
     - ✅ INITIAL_PURCHASE
     - ✅ RENEWAL
     - ✅ NON_RENEWING_PURCHASE
     - ✅ CANCELLATION
     - ✅ EXPIRATION
   - **Authorization**: (Optional but recommended)
6. Click "Save"

#### 3. Test the Deployment

```bash
# Test health endpoint
curl https://arc-api-564361317418.us-central1.run.app/health

# Should return:
# {"status":"ok","timestamp":"...","version":"1.0.0"}
```

## What Gets Fixed

### 1. Automatic Purchase Sync
- When user purchases Pro → RevenueCat webhook → Backend updates Firestore `isPro: true`
- No manual Firestore editing needed

### 2. Restore Purchases Works
- User taps "Restore Purchase" in Profile → App calls `/v1/purchases/sync` → Backend updates Firestore
- Already implemented in Profile screen

### 3. Auth Token Support
- App now sends Firebase auth token with all requests
- Backend correctly identifies users by Firebase UID
- No more device ID mismatches

### 4. Admin Tools
- `/internal/set-pro-status` endpoint for manual Pro status updates
- Can set Pro by email without Firebase Console

## Purchase Flow After Deployment

### Normal Purchase Flow
1. User taps "Upgrade to Pro"
2. RevenueCat handles purchase
3. RevenueCat webhook fires → Backend
4. Backend sets `isPro: true` in Firestore
5. User can immediately analyze

### Restore Purchase Flow
1. User taps "Restore Purchase" in Profile
2. App checks RevenueCat for entitlements
3. App calls `/v1/purchases/sync`
4. Backend sets `isPro: true` in Firestore
5. Success message shown

## Endpoints Added

### `/v1/purchases/sync` (Authenticated)
- Syncs RevenueCat purchases to backend
- Called by app after purchase or restore

### `/webhooks/revenuecat` (Public)
- Receives RevenueCat webhook events
- Automatically updates Firestore on purchase events
- **This is the permanent solution for automatic sync**

### `/internal/set-pro-status` (Internal)
- Admin endpoint to set Pro status by email
- For manual fixes without Firebase Console

## Verification Steps

After deployment:

1. **Test Analysis with Pro Account**
   ```bash
   # Check logs
   tail -f /home/user/workspace/expo.log

   # Should see:
   # [backend-api] Creating analysis job with: {"deviceId":"...", "hasToken":true, ...}
   # No 500 errors
   ```

2. **Test Purchase Sync**
   - Make test purchase in app
   - Check Firestore: `users/<firebase-uid>` should have `isPro: true`
   - Check backend logs for webhook event

3. **Test Restore Purchases**
   - Tap "Restore Purchase" in Profile
   - Should show "Success" message
   - Check Firestore for updated Pro status

## Troubleshooting

### If deployment fails:
```bash
# Check gcloud authentication
gcloud auth list

# Re-authenticate if needed
gcloud auth login

# Set correct project
gcloud config set project arc-ai-481122
```

### If webhook doesn't work:
1. Check RevenueCat webhook logs in dashboard
2. Verify URL is correct
3. Check backend logs: `gcloud run services logs read arc-api --region us-central1`

### If Pro status still not syncing:
1. Verify user document exists in Firestore `users` collection
2. Document ID should match Firebase Auth UID (visible in Profile screen)
3. Check that auth token is being sent: logs should show `hasToken: true`

## Current State vs After Deployment

### Before Deployment (Current State - BROKEN)
❌ Purchase sync endpoint doesn't exist
❌ Pro purchases don't update Firestore
❌ Manual Firestore editing required
❌ Wrong document ID causes issues
❌ Recurring "Failed to create analysis job" errors

### After Deployment (FIXED)
✅ Purchase sync endpoint active
✅ RevenueCat webhook auto-updates Firestore
✅ Restore purchases works
✅ Correct user identification via auth tokens
✅ Pro users can analyze without errors

## Files Changed

- `backend/src/routes/purchases.ts` - Purchase sync endpoint
- `backend/src/routes/webhooks.ts` - RevenueCat webhook handler
- `backend/src/routes/internal.ts` - Admin set-pro-status endpoint
- `backend/src/index.ts` - Route registration
- `src/screens/VideoCaptureScreen.tsx` - Auth token support
- `src/screens/ProfileScreen.tsx` - Restore purchases implementation

## Summary

**The permanent solution is to deploy the backend.** Once deployed:
- Purchases automatically sync via webhook
- No manual Firestore editing needed
- Pro users can analyze without errors
- The recurring issue is permanently resolved

Run: `cd backend && export GEMINI_API_KEY=your_key && ./deploy.sh`
