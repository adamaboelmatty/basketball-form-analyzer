# ARC Coach Web App - Firebase Configuration

Use this configuration when building the web app with Lovable.

---

## 🔥 Firebase Configuration

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBkhOP1rVLY_XbNIK9AHjtc6Fwm6JN-PAg",
  authDomain: "arc-ai-481122.firebaseapp.com",
  projectId: "arc-ai-481122",
  storageBucket: "arc-ai-481122.firebasestorage.app",
  messagingSenderId: "564361317418",
  appId: "1:564361317418:web:f0bb709a9e9e436ecc753",
  measurementId: "G-B0WD391ZKJ"
};
```

---

## 📝 For Lovable Prompt 1

Add this at the beginning of Prompt 1:

```
Build ARC Coach using Firebase Authentication + Cloud Firestore only.

Use this Firebase configuration:

const firebaseConfig = {
  apiKey: "AIzaSyBkhOP1rVLY_XbNIK9AHjtc6Fwm6JN-PAg",
  authDomain: "arc-ai-481122.firebaseapp.com",
  projectId: "arc-ai-481122",
  storageBucket: "arc-ai-481122.firebasestorage.app",
  messagingSenderId: "564361317418",
  appId: "1:564361317418:web:f0bb709a9e9e436ecc753",
  measurementId: "G-B0WD391ZKJ"
};

Initialize Firebase in your app and use Firebase Authentication for all user management.
All data should be stored in Cloud Firestore in this same project.
```

Then continue with the rest of the prompt content.

---

## 📊 Firestore Collections Schema

The web app will create these new collections:

### New Collections (Web App)
- `organizations` - Team ownership
- `teams` - Team/roster info
- `memberships` - User roles in teams
- `players` - Player roster profiles
- `coachAssignments` - Focus areas set by coaches
- `coachNotes` - Coach notes on players/sessions

### Existing Collections (iOS/Backend)
- `users` - User entitlements and pro status
- `sessions` - Completed analysis sessions
- `analyses` - In-progress analysis jobs

---

## 🔗 Firebase Console Links

**Project**: arc-ai-481122

- Authentication: https://console.firebase.google.com/u/0/project/arc-ai-481122/authentication/users
- Firestore: https://console.firebase.google.com/u/0/project/arc-ai-481122/firestore/databases/-default-/data
- Settings: https://console.firebase.google.com/u/0/project/arc-ai-481122/settings/general

---

## 🎨 Design Tokens for Lovable

```
Primary Colors:
- Primary Orange: #FF6B35
- Dark Background: #0A0A0A
- Dark Card: #1A1A1A
- Dark Border: #2A2A2A

Text Colors:
- Primary Text: #FFFFFF
- Secondary Text: #A0A0A0
- Muted Text: #606060

Status Colors:
- Success: #10B981
- Warning: #F59E0B
- Error: #EF4444
- Info: #3B82F6

Correction Category Colors:
- Balance & Verticality: #EF4444 (Red)
- Shot Line Integrity: #FF6B35 (Orange)
- Set Point Consistency: #3B82F6 (Blue)
- Release & Follow-Through: #10B981 (Green)
```

---

## 📋 Complete Prompts Ready

All 11 prompts have been prepared and are ready to use with Lovable.

See the conversation history for the complete, updated prompts that align with your current backend architecture.

---

## ✅ Authentication Providers Enabled

- ✅ Email/Password
- ✅ Google
- ✅ Apple

All authentication is handled through Firebase Auth in the `arc-ai-481122` project.

---

## 🚀 Ready to Build

Everything is configured and ready for you to start building the ARC Coach web app with Lovable!
