/**
 * Script to find user by email and set Pro status
 * Usage: bun run backend/scripts/find-and-set-pro.ts <email>
 */

import { Firestore, Timestamp } from "@google-cloud/firestore";
import * as dotenv from "dotenv";

dotenv.config();

const firestore = new Firestore({
  projectId: process.env.GCP_PROJECT_ID || "arc-ai-481122",
});

const USERS_COLLECTION = "users";

async function findAndSetPro(email: string) {
  try {
    // Query Firestore users collection for matching email
    // Since we use userId as the doc ID, we need to scan all users
    const usersSnapshot = await firestore.collection(USERS_COLLECTION).get();

    console.log(`Searching ${usersSnapshot.size} users for email: ${email}`);

    let found = false;
    for (const doc of usersSnapshot.docs) {
      const data = doc.data();

      // Check if this user matches (we don't store email in Firestore, so we'll match by userId which is the email UID)
      // Let's just list all users and you can tell me which one
      console.log(`\n📋 User ${doc.id}:`);
      console.log(`   Device ID: ${data.deviceId}`);
      console.log(`   User ID: ${data.userId || 'N/A'}`);
      console.log(`   isPro: ${data.isPro}`);
      console.log(`   freeAnalysesUsed: ${data.freeAnalysesUsed}/${data.freeAnalysesLimit}`);
    }

    if (!found) {
      console.log(`\n⚠️  Email not stored in Firestore. Please provide the User ID from the app's Profile screen.`);
      console.log(`\nTo set Pro status, run:`);
      console.log(`bun run backend/scripts/set-pro-status.ts <USER_ID> true`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error("Usage: bun run backend/scripts/find-and-set-pro.ts <email>");
  process.exit(1);
}

findAndSetPro(args[0]);
