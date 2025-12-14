/**
 * Script to set Pro status using Firebase Admin SDK
 * Usage: bun run backend/scripts/set-pro-firebase.ts <email>
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Initialize Firebase Admin with project ID only
if (getApps().length === 0) {
  initializeApp({
    projectId: "arc-ai-481122",
  });
}

const db = getFirestore();
const auth = getAuth();

async function findUserAndSetPro(email: string) {
  try {
    // First, find the user in Firebase Auth
    console.log(`Looking up user with email: ${email}`);

    const userRecord = await auth.getUserByEmail(email);
    console.log(`✅ Found user in Firebase Auth:`);
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Email: ${userRecord.email}`);

    // Now update their Firestore record
    const userId = userRecord.uid;
    const userRef = db.collection("users").doc(userId);
    const doc = await userRef.get();

    if (doc.exists) {
      console.log(`\n📋 Current Firestore data:`);
      const data = doc.data();
      console.log(`   isPro: ${data?.isPro}`);
      console.log(`   freeAnalysesUsed: ${data?.freeAnalysesUsed}`);
      console.log(`   freeAnalysesLimit: ${data?.freeAnalysesLimit}`);

      // Update to Pro
      await userRef.update({
        isPro: true,
        updatedAt: Timestamp.now(),
      });

      console.log(`\n✅ Successfully set isPro=true for ${email}`);
    } else {
      console.log(`\n⚠️  No Firestore document found for user ${userId}`);
      console.log(`   Creating new Pro user document...`);

      await userRef.set({
        userId: userId,
        deviceId: userId,
        isPro: true,
        freeAnalysesUsed: 0,
        freeAnalysesLimit: 1,
        createdAt: Timestamp.now(),
      });

      console.log(`✅ Created Pro user document for ${email}`);
    }

  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      console.error(`❌ No user found with email: ${email}`);
    } else {
      console.error("❌ Error:", error.message || error);
    }
    process.exit(1);
  }
}

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error("Usage: bun run backend/scripts/set-pro-firebase.ts <email>");
  process.exit(1);
}

findUserAndSetPro(args[0]);
