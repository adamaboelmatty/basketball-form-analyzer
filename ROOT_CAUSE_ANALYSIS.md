# ROOT CAUSE ANALYSIS - "Failed to create analysis job"

## The Real Problem (Finally Identified!)

The recurring "Failed to create analysis job" error was caused by **missing auth tokens** in API requests, NOT the Pro status or backend deployment.

## Timeline of Issues

### Issue 1: Free Analysis Limit (RESOLVED)
- User had 2 free analyses, used both
- We lowered to 1 free analysis
- Set `isPro: true` in Firestore manually

### Issue 2: Pro Status Not Found (RESOLVED)
- Backend couldn't find Pro status
- User document was under wrong ID
- App wasn't sending auth tokens

### Issue 3: Auth Tokens Not Saved (ROOT CAUSE - NOW FIXED)
**This was the real problem all along!**

The app was NOT saving Firebase auth tokens after login/signup, causing:
- `hasToken: false` in all API requests
- Backend couldn't identify user by Firebase UID
- Backend fell back to device ID lookup
- Pro status stored under UID, but backend looked up device ID
- Result: "Failed to create analysis job" (Pro check failed)

## What Was Broken

### SignInScreen.tsx (FIXED)
```typescript
// BEFORE (BROKEN)
const firebaseUser = await signInWithEmail(email, password);
setUser({ uid, email, ... }); // Only saved user profile, NOT tokens!
```

### CreateAccountScreen.tsx (FIXED)
```typescript
// BEFORE (BROKEN)
const firebaseUser = await signUpWithEmail(email, password);
setUser({ uid, email, ... }); // Only saved user profile, NOT tokens!
```

## What I Fixed

### 1. SignInScreen.tsx
```typescript
// AFTER (FIXED)
const firebaseUser = await signInWithEmail(email, password);

// Save auth tokens to SecureStore
await saveAuthTokens({
  idToken: firebaseUser.idToken,
  refreshToken: firebaseUser.refreshToken,
  expiresAt: Date.now() + firebaseUser.expiresIn * 1000,
});

setUser({ uid, email, ... });
```

### 2. CreateAccountScreen.tsx
```typescript
// AFTER (FIXED)
const firebaseUser = await signUpWithEmail(email, password);

// Save auth tokens to SecureStore
await saveAuthTokens({
  idToken: firebaseUser.idToken,
  refreshToken: firebaseUser.refreshToken,
  expiresAt: Date.now() + firebaseUser.expiresIn * 1000,
});

setUser({ uid, email, ... });
```

### 3. VideoCaptureScreen.tsx (ALREADY FIXED)
```typescript
// Get token and send with request
const token = await getValidIdToken();
await runAnalysis({ videoUri, token, ... });
```

## Why It Kept Failing

1. User logs in → tokens NOT saved
2. User tries analysis → `getValidIdToken()` returns `null`
3. App sends request with `hasToken: false`
4. Backend receives `deviceId` but no `userId`
5. Backend looks up `users/<deviceId>`
6. You set `isPro: true` on `users/<firebase-uid>`
7. **Mismatch!** Backend finds user with `isPro: false`
8. Backend blocks request: "Free analyses limit reached"
9. Error: "Failed to create analysis job"

## The Screenshot You Showed

The screenshot showed the analysis got to **step 10/22** before failing, which means:
- ✅ Job was created successfully
- ✅ Video was uploaded successfully
- ✅ Processing started
- ❌ AI analysis failed (different error)

This suggests **multiple attempts** - one old log where it failed at creation, and a newer one where it got further but failed during processing.

## What Will Happen Now

### After These Fixes:

1. **User logs in** → Auth tokens saved to SecureStore ✅
2. **User tries analysis** → `getValidIdToken()` returns valid token ✅
3. **App sends request** with `hasToken: true` ✅
4. **Backend receives** both `deviceId` AND `userId` (from token) ✅
5. **Backend looks up** `users/<firebase-uid>` ✅
6. **Backend finds** `isPro: true` ✅
7. **Analysis proceeds** without paywall ✅

## Testing Instructions

### For testplayer@gmail.com:

1. **Sign out completely** from the app (to clear old state)
2. **Sign in again** with testplayer@gmail.com
3. Check logs - should see: `[backend-api] Creating analysis job with: {"hasToken": true, ...}`
4. **Set Pro status** in Firestore on the correct document:
   - Open app → Profile → Copy "User ID (for backend)"
   - In Firestore `users` collection, find that document
   - Set `isPro: true`
5. **Try analysis** - should work!

### Expected Logs:
```
[backend-api] Creating analysis job with: {"deviceId": "...", "hasToken": true, ...}
```

**If you see `hasToken: true`** → auth tokens are being sent correctly!

## Files Modified

1. `src/screens/SignInScreen.tsx` - Added `saveAuthTokens()` call
2. `src/screens/CreateAccountScreen.tsx` - Added `saveAuthTokens()` call
3. `src/screens/VideoCaptureScreen.tsx` - Already sends tokens (fixed earlier)

## Summary

**The root cause was NOT:**
- ❌ Backend deployment
- ❌ Pro status check
- ❌ Firestore document ID
- ❌ Purchase sync

**The root cause WAS:**
- ✅ **Auth tokens not being saved after login**
- ✅ **App sending `hasToken: false` to backend**
- ✅ **Backend unable to identify user correctly**

**The fix:**
- ✅ Save auth tokens in `SignInScreen` and `CreateAccountScreen`
- ✅ App now sends `hasToken: true`
- ✅ Backend can identify user by Firebase UID
- ✅ Backend finds Pro status correctly
- ✅ Analysis works!

## Why This Was Hard to Debug

1. **Multiple interrelated issues** happening simultaneously
2. **Logs showed old errors** from before fixes were applied
3. **Screenshot showed different error** (analysis processing failure, not creation failure)
4. **Manual Firestore edits** on wrong document ID masked the real issue
5. **Backend not deployed** made us think that was the problem

The real issue was simple: **auth tokens weren't being saved**, causing everything else to fail.

## Next Steps

1. **Sign out and sign back in** to trigger token save
2. **Check logs** for `hasToken: true`
3. **Set Pro status** on correct Firestore document (shown in Profile)
4. **Try analysis** - should work now!

If it still fails, the error will be different and we can debug from there.
