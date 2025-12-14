# ARC - Basketball Coaching App

A coach-first basketball shooting app that delivers one clear, prioritized correction from video analysis.

## 🔄 Firebase Project Migration (Dec 2024)

**All components now use Firebase project: `arc-ai-481122`**

- ✅ iOS App authentication migrated from `arc--ai` to `arc-ai-481122`
- ✅ Backend Firestore already connected to `arc-ai-481122`
- ✅ Web app (ARC Coach) will use `arc-ai-481122`
- ✅ All user data, sessions, and analyses in one unified Firebase project

**Note:** Existing users from the old project will need to re-authenticate with new credentials.

## Core Philosophy

This app feels: calm, focused, coach-like. Not busy, not gamified.

## Two-Layer Architecture

### Layer 1 - Shot Analysis (Coach Judgment)
**"What should I fix first?"**
- 1 clip → 1 correction
- Mechanic-focused
- Subjective but expert
- Uses pose analysis + AI reasoning

### Layer 2 - Session Analysis (NOAH-lite)
**"What tendencies do I have over a session?"**
- 5-10 shots → patterns
- Arc / Depth / Left-Right / Consistency
- Trend-focused, objective
- Uses ball + rim tracking

**The Bridge:** Session Analysis never gives coaching advice directly. It feeds signals into the Coach Judgment layer.

> "Based on this session, your coach wants you focusing on [X]."

## The Three Jobs

### Job 1 - Insight
"Tell me what my coach would fix first."
- Record and analyze shooting videos via AI (GPT-4o + pose analysis)
- Identify the single most important issue
- Provide one correction with explanation and drill

### Job 2 - Guidance
"Tell me what to work on every time I practice."
- Persist the same correction across sessions
- Show "Your Current Focus" prominently on Home
- Suppress new advice until improvement is visible

### Job 3 - Validation
"Tell me if I'm actually improving."
- Reference past clips
- Acknowledge improvement qualitatively
- Use coach language ("more consistent", "cleaner")

## Home Screen CTAs

Two CTAs (stacked, not equal weight):
1. **"Analyze a Shot"** (Primary) - Record a single shot for instant feedback
2. **"Analyze a Session"** (Secondary) - Record 5-10 shots to see patterns

Helper text under #2: "Best for 5-10 free throws"

## Shot Analysis Flow
- User records a video (up to 30 seconds) or selects from gallery
- Video is immediately played back at 2.5x speed with scanning animations
- Backend processes video through CV pipeline (pose estimation, form analysis)
- User receives one prioritized correction with drill recommendation

## Session Analysis Flow

1. **Capture Guidance** - Setup instructions (stable phone, hoop visible, etc.)
2. **Rim Calibration** - User aligns circle overlay to rim, selects angle (side/front)
3. **Session Recording** - Record 5-10 free throws
4. **Analyzing** - Video plays at 2.5x speed with scanning animations and task progression
5. **Results** - 4 metric cards + coach recommendation

### Session Metrics (Trends Only)
- **Arc:** Higher / Lower / Stable
- **Depth:** Short / Long / Centered
- **Left-Right:** Left / Right / Centered (front angle only)
- **Consistency:** Improving / Mixed / Unstable

No numeric values shown. Trends only.

### Session Analysis Backend Requirements
- Ball tracking CV service
- Attempt segmentation
- Metrics computation
- Video processing pipeline
- Returns: `metricsSummary` + `confidenceSummary`

## Onboarding Flow (Cialdini Principles)

1. **Authority + Unity** - Coach-backed intro
2. **Liking** - Problem framing ("Most players practice the wrong thing")
3. **Commitment** - Goal selection (micro-choice)
4. **Reciprocity** - Coaching insight ("Fix one thing at a time")
5. **WOW Moment** - Demo flow (simulated record → analyze → feedback)
6. **Scarcity** - Free tier explanation (1 analysis)
7. **Paywall** - Before account creation
8. **Account Creation** - Required for all users

## Navigation Structure

**Bottom Tabs (2 only):**
1. Home - Current focus + two CTAs
2. Sessions - Past session history

**Profile:** Access via top-right icon (dedicated screen with back button)

**Shot Analysis Flow:**
VideoCapture → Analyzing → CoachFeedback

**Session Analysis Flow:**
SessionCaptureGuidance → RimCalibration → SessionRecord → Analyzing → SessionResults

### Analyzing Screen
- Plays video at 2.5x speed with visual overlays
- Animated scanning line with grid pattern
- Corner brackets for technical feel
- Task progression showing 4 steps:
  1. Uploading video
  2. Extracting frames
  3. Analyzing form
  4. Generating feedback
- Each task shows status (pending/processing/complete) with icons and animated spinners
- Auto-navigates to appropriate result screen when complete

## Backend Architecture

**Status: ✅ DEPLOYED TO GOOGLE CLOUD**
- **API URL**: https://arc-api-564361317418.us-central1.run.app
- **Project**: arc-ai-481122
- **Region**: us-central1

### API Endpoints (Mobile App calls these)

```
POST /v1/analysis          - Create analysis job, get signed upload URL
GET  /v1/analysis/{id}     - Check analysis status
GET  /v1/analysis/{id}/result - Get coach feedback results
GET  /v1/sessions          - List past sessions
GET  /v1/entitlements      - Check Pro status and remaining free analyses
POST /v1/purchases/sync    - Sync RevenueCat purchase with backend

# Session Analysis (NOAH-lite)
POST /v1/session-analysis  - Create session analysis with rim calibration
GET  /v1/session-analysis/{id} - Get session metrics and coach recommendation
```

### Analysis Pipeline (Backend)

**Status: ✅ FULLY IMPLEMENTED**

1. **Validate entitlement** - Check free limit (1 total) or Pro status
2. **Store video** - Upload to GCS bucket with signed URLs
3. **Extract frames** - FFmpeg to get key frames @ 15fps (max 50 frames)
4. **Pose landmarks** - MediaPipe Pose Landmarker (33-point model) on frames
5. **Ball tracking** - OpenCV color + shape detection for trajectory analysis
6. **Compute heuristics** - Balance, shot line, set point, release metrics
7. **Gemini call** - Gemini 2.0 Flash with video + pose context for coaching
8. **Save session** - Persist results in Firestore, cleanup temp files

**Processing Time**: ~10-18 seconds per analysis
**Graceful Degradation**: If CV fails, Gemini analysis still works

### Session Analysis Pipeline (Backend - To Be Built)

**Status: 🚧 IN PROGRESS** (Ball tracking implemented, session aggregation needed)

1. **Receive video + rim calibration**
2. **Extract frames** - FFmpeg @ 15fps
3. **Detect/track ball across frames** - OpenCV HSV filtering + contour detection
4. **Segment shot attempts** - Detect ball entering rim area
5. **Compute per-attempt metrics** (arc proxy, depth proxy, LR proxy)
6. **Aggregate trends** (vs last session if available)
7. **Return metrics summary + confidence**

### External Services

- **Google Gemini 2.0 Flash** - Coach reasoning and output generation
- **MediaPipe Pose Landmarker** - 33-point pose extraction from frames
- **OpenCV** - Ball tracking and trajectory analysis
- **FFmpeg** - Video frame extraction
- **Google Cloud Storage** - Video storage with signed URLs
- **Google Firestore** - Analysis jobs, user data, session history
- **Google Cloud Tasks** - Async job processing queue
- **Google Cloud Run** - Serverless backend deployment
- **Firebase Auth** - Email/Password + Apple Sign-In
- **RevenueCat** - Subscription management

### Environment Variables Required

```env
# Backend API (CONFIGURED ✅)
EXPO_PUBLIC_API_BASE_URL=https://arc-api-564361317418.us-central1.run.app

# Firebase Auth (CONFIGURED ✅) - Updated to arc-ai-481122 project
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyBkhOP1rVLY_XbNIK9AHjtc6Fwm6JN-PAg
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=arc-ai-481122.firebaseapp.com

# RevenueCat (CONFIGURED ✅)
EXPO_PUBLIC_VIBECODE_REVENUECAT_APPLE_KEY=appl_IVESEvocXmAzZGUPcqeRlgXggmg
EXPO_PUBLIC_VIBECODE_REVENUECAT_TEST_KEY=test_rneWnbRnhfWjwPWhFdeOPulyUWs

# Fallback APIs (CONFIGURED ✅)
EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY=sk-proj-...
EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY=...
```

## File Structure

```
src/
  api/
    backend-api.ts          # Backend API client (signed URLs, polling)
    analysis-service.ts     # Full analysis flow orchestration
    firebase-auth.ts        # Firebase Auth (email + Apple Sign-In)
    revenuecat.ts           # RevenueCat subscription management
    coaching-analysis.ts    # Direct OpenAI fallback (GPT-4o vision)
  navigation/
    RootNavigator.tsx       # Bottom tabs + stack navigation
  screens/
    HomeScreen.tsx          # Current focus + two CTAs
    SessionsScreen.tsx      # Session history list
    VideoCaptureScreen.tsx  # Camera capture with entitlement checks
    CoachFeedbackScreen.tsx # Post-analysis feedback (4 sections)
    SessionDetailScreen.tsx # Individual session view
    ProfileScreen.tsx       # User info, settings, sign out
    PaywallScreen.tsx       # Pro subscription (Cialdini: Social Proof)
    OnboardingScreen.tsx    # 6-screen onboarding with demo flow
    CreateAccountScreen.tsx # Required account creation
    # Session Analysis Flow
    SessionCaptureGuidanceScreen.tsx  # Setup instructions
    RimCalibrationScreen.tsx          # Rim alignment UI
    SessionRecordScreen.tsx           # Record 5-10 shots
    SessionResultsScreen.tsx          # Metric cards + coach bridge
  state/
    coachingStore.ts        # Sessions, focus tracking, entitlements
    onboardingStore.ts      # Onboarding + account creation flags
    userStore.ts            # User profile + auth tokens
  types/
    coaching.ts             # Shot analysis type definitions
    session-analysis.ts     # Session analysis type definitions
```

## Coaching Decision Framework

Correction Priority (only one shown):
1. Balance & verticality
2. Shot line integrity (elbow + ball path)
3. Set point consistency
4. Release & follow-through

## Monetization

- **Free:** 1 total analysis (reduced from 2) - enforced by device_id or user_id
- **Pro:** $14.99/month or $89.99/year (Best Value highlighted)
- RevenueCat configured with:
  - Entitlement: `pro`
  - Products: `arc_pro_monthly`, `arc_pro_annual`
  - Offering: `default` with `$rc_monthly` and `$rc_annual` packages
  - **Webhook**: `https://arc-api-564361317418.us-central1.run.app/webhooks/revenuecat` (auto-syncs purchases to Firestore)

### Purchase Sync Flow (Automated)
1. User purchases Pro → RevenueCat webhook fires → Backend updates Firestore `isPro: true`
2. User taps "Restore Purchase" → App calls `/v1/purchases/sync` → Backend updates Firestore
3. Auth tokens ensure correct user identification (no device ID mismatches)

### Auth Token Implementation (Critical for Pro Status)
- **SignInScreen**: Now saves Firebase auth tokens after successful login
- **CreateAccountScreen**: Now saves Firebase auth tokens after signup
- **VideoCaptureScreen**: Retrieves and sends auth tokens with analysis requests
- Backend uses auth tokens to identify users by Firebase UID, ensuring Pro status is correctly looked up

## Tech Stack

- Expo SDK 53 + React Native 0.76.7
- Gemini API for coach output (via backend)
- MediaPipe for pose extraction (via backend)
- Firebase Auth for authentication
- RevenueCat for subscriptions
- Zustand + AsyncStorage for state
- NativeWind for styling
- React Navigation (bottom-tabs + native-stack)
- Langfuse for observability (backend)

## Setup Instructions

**Status: ✅ COMPLETE - App is ready to test!**

1. ✅ Environment variables configured in `.env`
2. ✅ Firebase project configured with Email/Password + Apple Sign-In
3. ✅ RevenueCat configured with MCP integration
4. ✅ Backend deployed to Google Cloud Run
5. ✅ Computer vision pipeline implemented (MediaPipe + OpenCV)

**To redeploy backend with latest fixes:**
```bash
cd backend
export GEMINI_API_KEY=your_key_here
./deploy.sh
```

**To run mobile app:**
```bash
bun start
```

## Current Development Status

### ✅ Completed
- Mobile app UI (all screens)
- Video capture and playback
- Firebase authentication
- RevenueCat subscriptions
- Backend API with CV pipeline
- MediaPipe pose estimation
- OpenCV ball tracking
- Gemini coaching analysis
- Google Cloud deployment

### 🚧 In Progress
- Session analysis aggregation
- Production testing

### 📋 To Do
- Session analysis full implementation
- Production monitoring
- User testing
