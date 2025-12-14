# 🎯 Manual Steps Required

Everything has been set up automatically. Here's what YOU need to do:

---

## ✅ What I've Done For You

1. ✅ Created `TESTING_GUIDE.md` - Complete testing instructions
2. ✅ Created `FIRESTORE_RULES.txt` - Copy-paste Firestore security rules
3. ✅ Created `WEB_APP_CONFIG.md` - Firebase config for Lovable
4. ✅ Created `setup-env.sh` - Automated setup script
5. ✅ Updated `README.md` - New Firebase credentials documented

---

## 📝 Step 1: Create Your .env File

Since .env files are gitignored, you need to create it manually:

```bash
cd /home/user/workspace

# Create .env file
cat > .env << 'EOF'
# ARC Basketball App - Environment Variables
# Firebase Project: arc-ai-481122

# Backend API
EXPO_PUBLIC_API_BASE_URL=https://arc-api-564361317418.us-central1.run.app

# Firebase Auth (arc-ai-481122)
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyBkhOP1rVLY_XbNIK9AHjtc6Fwm6JN-PAg
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=arc-ai-481122.firebaseapp.com

# RevenueCat
EXPO_PUBLIC_VIBECODE_REVENUECAT_APPLE_KEY=appl_IVESEvocXmAzZGUPcqeRlgXggmg
EXPO_PUBLIC_VIBECODE_REVENUECAT_TEST_KEY=test_rneWnbRnhfWjwPWhFdeOPulyUWs
EOF

# Verify it was created
cat .env
```

---

## 🔥 Step 2: Update Firestore Security Rules

**IMPORTANT:** Your Firestore rules need to allow authenticated writes.

1. Go to: https://console.firebase.google.com/u/0/project/arc-ai-481122/firestore/rules

2. Open the file `FIRESTORE_RULES.txt` I created

3. Copy the rules (the section under "DEVELOPMENT RULES")

4. Paste into Firebase Console

5. Click **"Publish"**

**This is CRITICAL - without this, account creation will fail with PERMISSION_DENIED**

---

## 🚀 Step 3: Start Your App

```bash
cd /home/user/workspace

# Clear all caches
rm -rf node_modules/.cache
rm -rf .expo

# Start with clean slate
npm start -- --clear
```

**Wait for Metro bundler to start, then open on simulator/device**

---

## 🧪 Step 4: Test Account Creation

### Test Email/Password:

1. Navigate to Create Account screen
2. Enter:
   - Email: `test@arc.basketball`
   - Password: `Test123456`
3. Click "Sign Up"

### Expected Result:
- ✅ "Account created successfully" message
- ✅ User is logged in
- ✅ Can see home screen

---

## ✅ Step 5: Verify in Firebase Console

### Check Authentication:
1. Go to: https://console.firebase.google.com/u/0/project/arc-ai-481122/authentication/users
2. Should see your test user listed
3. Note the User UID

### Check Firestore:
1. Go to: https://console.firebase.google.com/u/0/project/arc-ai-481122/firestore/databases/-default-/data
2. Open `users` collection
3. Should see document with your user data

---

## 🎥 Step 6: Test Full Video Analysis

1. Record a basketball shot (5-10 seconds)
2. Submit for analysis
3. Wait for completion
4. View coaching feedback

### Verify in Firestore:
- `analyses` collection: Should have your analysis (status: complete)
- `sessions` collection: Should have your session with feedback

---

## 📊 Step 7: Monitor Backend (Optional)

Watch backend logs in real-time:

```bash
gcloud run services logs read arc-api --region us-central1 --tail
```

---

## 🚨 Troubleshooting

### Issue: "Network request failed"
**Solution:**
```bash
# Verify .env was created
cat .env

# If empty or wrong, recreate it (see Step 1)
# Then restart app
npm start -- --clear
```

### Issue: "PERMISSION_DENIED" 
**Solution:**
- Go to Firebase Console → Firestore → Rules
- Copy rules from `FIRESTORE_RULES.txt`
- Publish

### Issue: "EMAIL_PASSWORD_PROVIDER_DISABLED"
**Solution:**
- Go to: https://console.firebase.google.com/u/0/project/arc-ai-481122/authentication/providers
- Verify Email/Password is Enabled
- If not, enable it

---

## 🎯 Success Checklist

Mark these off as you test:

- [ ] .env file created with correct credentials
- [ ] Firestore rules updated and published
- [ ] App started with `npm start -- --clear`
- [ ] Created test account successfully
- [ ] User appears in Firebase Authentication
- [ ] User document created in Firestore
- [ ] Recorded and analyzed a video
- [ ] Analysis completed successfully
- [ ] Coaching feedback displayed
- [ ] Session saved to Firestore

---

## 🌐 Next: Build Web App

Once iOS app testing is successful:

1. Open `WEB_APP_CONFIG.md` for Firebase config
2. Use the 11 updated prompts I provided earlier
3. Feed them to Lovable to build ARC Coach web app
4. Web app will use the same Firebase project (arc-ai-481122)

---

## 📞 Quick Reference

**Firebase Console Links:**
- Users: https://console.firebase.google.com/u/0/project/arc-ai-481122/authentication/users
- Firestore: https://console.firebase.google.com/u/0/project/arc-ai-481122/firestore
- Rules: https://console.firebase.google.com/u/0/project/arc-ai-481122/firestore/rules
- Auth Providers: https://console.firebase.google.com/u/0/project/arc-ai-481122/authentication/providers

**Test Credentials:**
- Email: `test@arc.basketball`
- Password: `Test123456`

**Backend URL:**
- https://arc-api-564361317418.us-central1.run.app

**Project ID:**
- arc-ai-481122

---

## 📚 Documentation Files Created

- `TESTING_GUIDE.md` - Detailed testing instructions
- `FIRESTORE_RULES.txt` - Security rules for Firebase
- `WEB_APP_CONFIG.md` - Config for Lovable web app
- `MANUAL_STEPS.md` - This file!
- `setup-env.sh` - Setup script (not needed if you follow Step 1)

---

That's it! Start with Step 1 and work through the checklist. 🚀
