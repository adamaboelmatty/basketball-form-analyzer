# ACTION PLAN - Fix Analysis Errors

## Current Situation

Based on the logs and backend health check, here's what's happening:

### ❌ Issues Found:
1. **Backend NOT deployed** - The `/v1/purchases/sync` endpoint returns 404, meaning the backend is still running OLD code without the auth token fixes
2. **Auth tokens NOT being saved** - Logs still show `hasToken: false`, meaning you haven't signed out/in since I implemented the token save fix
3. **Screenshot shows different error** - Analysis got to step 10/22 before failing, which is a different issue (possibly lighting/video quality related)

## Required Actions (In Order)

### Step 1: Sign Out and Sign Back In ⚠️ CRITICAL
This triggers the auth token save that I just implemented.

**Instructions:**
1. Open the app
2. Go to Profile screen
3. Scroll down and tap "Sign Out"
4. Sign back in with testplayer@gmail.com
5. Check logs - should now see `"hasToken": true` instead of `false`

### Step 2: Verify Pro Status Document ID
After signing back in, get the correct user ID:

1. Go to Profile screen
2. Scroll to bottom
3. Find "User ID (for backend)" - copy this ID
4. Go to Firebase Console → Firestore → `users` collection
5. Find the document with that ID
6. Make sure `isPro: true` is set on THIS document

### Step 3: Test Analysis
Try recording and analyzing a video. Check logs for:
```
[backend-api] Creating analysis job with: {"hasToken": true, ...}
```

If you see `hasToken: true`, the auth fix is working!

### Step 4: Deploy Backend (Permanent Solution)
The backend needs to be deployed with the new code for:
- RevenueCat webhook auto-sync
- Purchase restore functionality
- Better error handling

**Option A: Cloud Console (Recommended)**
1. Download `/home/user/workspace/backend-deployment.tar.gz`
2. Follow instructions in `DEPLOY_VIA_CONSOLE.md`
3. This takes 3-5 minutes via GUI

**Option B: Command Line (If you have gcloud CLI)**
1. Run from your local machine (NOT this sandbox):
```bash
cd backend
export GEMINI_API_KEY=your_api_key
./deploy.sh
```

## Expected Results

### After Step 1-3 (Auth Token Fix):
✅ Logs show `hasToken: true`
✅ Backend correctly identifies user by Firebase UID
✅ Pro status is found in correct Firestore document
✅ Analysis jobs can be created without "Failed to create analysis job" error

### After Step 4 (Backend Deployment):
✅ RevenueCat webhook automatically syncs purchases
✅ Restore purchases works in Profile screen
✅ No manual Firestore editing needed
✅ Admin endpoint available for support

## About the Screenshot Error

The screenshot shows "Unable to analyze the video. Please try recording again with better lighting" at step 10/22.

This is a **different error** from "Failed to create analysis job". It means:
- ✅ Job creation succeeded
- ✅ Video upload succeeded
- ✅ Processing started
- ❌ AI analysis couldn't process the video (lighting/quality issue)

This could be:
1. **Old cached error** from before Pro status was set
2. **Actual video quality issue** - the video was too dark/blurry for the AI
3. **Backend processing error** during AI analysis (not creation)

To debug this specific error:
1. Try recording a new video in **good lighting**
2. Make sure the shot is **clearly visible**
3. Check backend logs for the specific error during processing

## Why This Keeps Happening

The root cause was **auth tokens not being saved after login**, causing:
1. App sends `hasToken: false`
2. Backend can't identify user by Firebase UID
3. Backend falls back to device ID lookup
4. Pro status was set on Firebase UID document, not device ID document
5. **Mismatch!** Backend thinks user is not Pro
6. Backend blocks analysis job creation

**The fix:** Save auth tokens in login/signup screens → Backend receives tokens → Backend identifies user by UID → Backend finds Pro status → Analysis succeeds

## Current Status

| Task | Status | Action Required |
|------|--------|----------------|
| Auth token save implemented | ✅ Done | None |
| User re-login | ❌ Pending | **YOU - Sign out/in** |
| Backend deployment | ❌ Pending | **YOU - Deploy via console** |
| RevenueCat webhook | ❌ Pending | **YOU - Configure after deploy** |

## Next Steps

**Right Now:**
1. Sign out and sign back in with testplayer@gmail.com
2. Verify correct Pro status document in Firestore
3. Try analysis - should work!

**For Permanent Solution:**
1. Deploy backend using `DEPLOY_VIA_CONSOLE.md`
2. Configure RevenueCat webhook (instructions in that document)
3. Test purchase flow end-to-end

## Questions?

- If analysis still fails after re-login, share the NEW logs
- If you need help with Cloud Console deployment, let me know
- If the "lighting" error persists, we may need to debug the AI processing step

The critical path is: **Sign out → Sign in → Test → Deploy backend**
