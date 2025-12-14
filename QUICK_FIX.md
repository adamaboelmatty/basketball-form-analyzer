# Quick Fix Guide - Pro User Analysis Errors

## Immediate Fix (Until Backend Deployed)

Since you've set `isPro: true` in Firestore but still getting errors, the issue is **auth token/document ID mismatch**.

### Steps:

1. **Get the correct User ID:**
   - Open app with testplayer@gmail.com
   - Go to Profile screen
   - Scroll to bottom - copy the "User ID (for backend)"
   - Example: `abc123xyz456`

2. **Update Firestore:**
   - Go to Firebase Console → Firestore
   - Open `users` collection
   - Find document with ID from step 1
   - Set `isPro: true`
   - Save

3. **Try analysis again** - should work immediately

## Permanent Fix - Deploy Backend

```bash
cd backend
export GEMINI_API_KEY=your_gemini_api_key
./deploy.sh
```

After deployment:
- Configure RevenueCat webhook (see DEPLOYMENT_GUIDE.md)
- Purchases automatically sync
- No more manual Firestore editing

## What Changed

✅ **App now sends auth tokens** - identifies users correctly
✅ **Purchase sync endpoint** - `/v1/purchases/sync`
✅ **RevenueCat webhook** - automatic Pro status updates
✅ **Restore purchases works** - Profile screen button
✅ **Admin endpoint** - `/internal/set-pro-status` for manual fixes

## Files Modified

**Backend:**
- `src/routes/purchases.ts` - NEW: Purchase sync
- `src/routes/webhooks.ts` - NEW: RevenueCat webhook
- `src/routes/internal.ts` - NEW: Admin set-pro-status
- `src/index.ts` - Route registration

**Frontend:**
- `src/screens/VideoCaptureScreen.tsx` - Auth token support
- `src/screens/ProfileScreen.tsx` - Restore purchases
- `src/api/backend-api.ts` - Debug logging

## Why It Was Failing

**Before:**
- App sent: `deviceId: 85858548-9b5e-43e2-94f5-41c90f13dfd5`, `token: null`
- Backend looked up: `users/85858548-9b5e-43e2-94f5-41c90f13dfd5`
- You set Pro on: `users/<firebase-auth-uid>`
- **Mismatch! Backend couldn't find Pro status**

**After:**
- App sends: `deviceId: ...`, `token: <firebase-token>`
- Backend extracts: `userId: <firebase-auth-uid>`
- Backend looks up: `users/<firebase-auth-uid>`
- **Match! Backend finds Pro status**

## Summary

**Right now:** Set `isPro: true` on the document ID shown in Profile screen

**Permanent:** Deploy backend + configure RevenueCat webhook

See `DEPLOYMENT_GUIDE.md` for full details.
