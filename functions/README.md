# ARC Firebase Cloud Functions

This directory contains Firebase Cloud Functions for the ARC basketball coaching app.

## Functions

### `linkPlayerOnSignup`

**Trigger:** `auth.user().onCreate`

Automatically links a player record to a Firebase Auth user when they sign up on the iOS app. This enables coaches (who add players via the web app) to see their players' sessions and progress.

**Flow:**
1. Coach creates a player in the web app with an email (e.g., `johndoe@gmail.com`)
2. Player downloads iOS app and signs up with the same email
3. This function triggers automatically and links the player document to the new user's UID
4. Coach can now see the player's sessions in the web app

### `backfillPlayerLinks`

**Trigger:** HTTP POST request

One-time function to link existing users who signed up before the `linkPlayerOnSignup` function was deployed.

## Setup

### Prerequisites

1. [Node.js](https://nodejs.org/) v18 or later
2. [Firebase CLI](https://firebase.google.com/docs/cli) installed globally:
   ```bash
   npm install -g firebase-tools
   ```

### Installation

```bash
cd functions
npm install
```

### Configuration

1. Login to Firebase:
   ```bash
   firebase login
   ```

2. Set your Firebase project:
   ```bash
   firebase use YOUR_PROJECT_ID
   ```
   
   Or create a `.firebaserc` file:
   ```json
   {
     "projects": {
       "default": "YOUR_PROJECT_ID"
     }
   }
   ```

## Deployment

### Deploy Functions

```bash
# From the repo root
firebase deploy --only functions

# Or from the functions directory
npm run deploy
```

### Test Locally

```bash
# Start the emulator
npm run serve

# This starts the Firebase emulator suite with Functions
```

## Logs

View function logs:

```bash
firebase functions:log

# Or follow logs in real-time
firebase functions:log --follow
```

## Running the Backfill

After deploying, if you have existing users who signed up before the function was deployed:

```bash
# Using curl
curl -X POST \
  -H "Authorization: Bearer YOUR_SECRET_TOKEN" \
  https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/backfillPlayerLinks

# Or via Firebase CLI
firebase functions:call backfillPlayerLinks
```

## Firestore Structure

This function expects the following Firestore structure:

### `players` collection

```typescript
{
  name: string;
  email: string;          // Used to match with Firebase Auth user
  teamId: string;
  playerUid?: string;     // Set by this function when linked
  linkedAt?: Timestamp;   // Set by this function when linked
  // ... other fields
}
```

## Troubleshooting

### Function not triggering

1. Check that the function is deployed: `firebase functions:list`
2. Check logs for errors: `firebase functions:log`
3. Verify the user has an email associated with their account

### Players not linking

1. Ensure emails match exactly (function normalizes to lowercase)
2. Check that the player record exists before user signs up
3. Verify `playerUid` field is not already set

### Permission errors

Ensure the Firebase Admin SDK has proper permissions to:
- Read from `players` collection
- Write to `players` collection
- Read Firebase Auth users (for backfill)
