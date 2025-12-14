# ARC App Testing Guide

## 🎯 Firebase Migration Complete

All components now use Firebase project: **arc-ai-481122**

---

## ✅ What's Been Configured Automatically

1. ✅ `.env` file created with correct Firebase credentials
2. ✅ iOS app code already configured for Firebase Auth REST API
3. ✅ Backend already connected to arc-ai-481122 Firestore
4. ✅ README.md updated with new credentials
5. ✅ Firebase apps registered (iOS + Web)

---

## 🔧 Firebase Console Configuration Status

### Already Done by You:
- ✅ Email/Password authentication enabled
- ✅ Google authentication enabled  
- ✅ Apple authentication enabled

### Still Need to Verify:
- ⚠️ **Firestore Security Rules** - Need to update for development

---

## 🧪 Testing Workflow

### Step 1: Start Development Server

```bash
cd /home/user/workspace

# Clear cache and start
rm -rf node_modules/.cache
rm -rf .expo
npm start -- --clear
```

### Step 2: Test Account Creation

**Test Email/Password Signup:**
1. Open app in simulator/device
2. Go to Create Account screen
3. Test credentials:
   - Email: `test@arc.basketball`
   - Password: `Test123456`
4. Click Sign Up

**Expected Result:**
- ✅ User created successfully
- ✅ User logged in
- ✅ User ID available in app

### Step 3: Verify in Firebase Console

**Check Authentication:**
1. Go to: https://console.firebase.google.com/u/0/project/arc-ai-481122/authentication/users
2. Look for your test user
3. Note the User UID

**Check Firestore:**
1. Go to: https://console.firebase.google.com/u/0/project/arc-ai-481122/firestore/databases/-default-/data
2. Check `users` collection for new document
3. Document should have: `deviceId`, `userId`, `isPro: false`, etc.

### Step 4: Test Video Analysis (Full Flow)

1. Record a basketball shot video (5-10 seconds)
2. Submit for analysis
3. Monitor status: Uploading → Analyzing → Complete
4. View coaching feedback
5. Check session appears in history

**Verify in Firestore:**
- `analyses` collection: New doc with status: complete
- `sessions` collection: New doc with coaching feedback

---

## 🚨 Troubleshooting

### Issue: "Network request failed"
```bash
# Verify env vars are loaded
cat .env

# Restart with clean cache
npm start -- --clear
```

### Issue: "PERMISSION_DENIED" in Firestore

**Update Security Rules:**

1. Go to: https://console.firebase.google.com/u/0/project/arc-ai-481122/firestore/rules
2. Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Development rules - allow authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click "Publish"

### Issue: Apple Sign-In not working

**Apple Sign-In requires:**
1. Real iOS device (not simulator)
2. Apple Developer Account configured
3. Service ID and Team ID in Firebase Console

**Configure:**
1. Go to: https://console.firebase.google.com/u/0/project/arc-ai-481122/authentication/providers
2. Click "Apple"
3. Add your Apple Developer Team ID and Service ID

---

## 📊 Success Checklist

Test complete when you have:

- [ ] User created in Firebase Authentication
- [ ] User document in Firestore `users` collection
- [ ] Can record and submit video
- [ ] Analysis completes successfully
- [ ] Coaching feedback displayed
- [ ] Session saved to Firestore
- [ ] Session appears in app history

---

## 🎯 Test Accounts

For testing different scenarios:

**Test User 1 (Free):**
- Email: `test@arc.basketball`
- Password: `Test123456`

**Test User 2 (Pro):**
- Email: `pro@arc.basketball`
- Password: `Pro123456`
- (Mark as Pro in RevenueCat after creation)

---

## 📱 Backend Monitoring

Watch backend logs in real-time:

```bash
gcloud run services logs read arc-api --region us-central1 --tail
```

This shows:
- API requests
- Video processing
- Gemini AI analysis
- Errors and warnings

---

## 🌐 Firebase Console Quick Links

- **Authentication Users**: https://console.firebase.google.com/u/0/project/arc-ai-481122/authentication/users
- **Firestore Database**: https://console.firebase.google.com/u/0/project/arc-ai-481122/firestore/databases/-default-/data
- **Auth Providers**: https://console.firebase.google.com/u/0/project/arc-ai-481122/authentication/providers
- **Firestore Rules**: https://console.firebase.google.com/u/0/project/arc-ai-481122/firestore/rules
- **Project Settings**: https://console.firebase.google.com/u/0/project/arc-ai-481122/settings/general

---

## 🚀 Next Steps After Testing

Once iOS app is working:
1. ✅ Document any issues found
2. ✅ Test all auth methods (Email, Apple, Google)
3. ✅ Prepare to build ARC Coach web app with Lovable
4. ✅ Consider adding `teamId` support to backend for coach features

---

## 💡 Tips

- Use Chrome DevTools for debugging: `npx expo start --web`
- Clear app data if you need to test signup again
- Watch Firestore in real-time to see data being written
- Keep Firebase Console open while testing

Good luck! 🏀
