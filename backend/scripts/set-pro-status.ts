/**
 * Script to manually set a user's Pro status in Firestore
 * Usage: bun run backend/scripts/set-pro-status.ts <deviceId_or_userId> <true|false>
 */

import { Firestore } from "@google-cloud/firestore";
import * as dotenv from "dotenv";

dotenv.config();

const firestore = new Firestore({
  projectId: process.env.GCP_PROJECT_ID || "arc-ai-481122",
});

const USERS_COLLECTION = "users";

async function setProStatus(userId: string, isPro: boolean) {
  try {
    const userRef = firestore.collection(USERS_COLLECTION).doc(userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      console.error(`❌ User ${userId} not found in Firestore`);
      process.exit(1);
    }

    await userRef.update({
      isPro,
      updatedAt: Firestore.Timestamp.now(),
    });

    console.log(`✅ Successfully set isPro=${isPro} for user ${userId}`);

    // Show updated user data
    const updatedDoc = await userRef.get();
    const userData = updatedDoc.data();
    console.log("\nUpdated user data:");
    console.log(`  Device ID: ${userData?.deviceId}`);
    console.log(`  User ID: ${userData?.userId || "N/A"}`);
    console.log(`  isPro: ${userData?.isPro}`);
    console.log(`  freeAnalysesUsed: ${userData?.freeAnalysesUsed}`);
    console.log(`  freeAnalysesLimit: ${userData?.freeAnalysesLimit}`);
  } catch (error) {
    console.error("❌ Error updating Pro status:", error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error("Usage: bun run backend/scripts/set-pro-status.ts <deviceId_or_userId> <true|false>");
  process.exit(1);
}

const userId = args[0];
const isPro = args[1].toLowerCase() === "true";

setProStatus(userId, isPro);
