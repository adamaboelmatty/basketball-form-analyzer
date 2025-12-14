/**
 * Script to find a user by email in Firebase Auth
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import * as dotenv from "dotenv";

dotenv.config();

const projectId = process.env.GCP_PROJECT_ID || "arc-ai-481122";

// Initialize Firebase Admin
initializeApp({
  projectId,
});

async function findUserByEmail(email: string) {
  try {
    const auth = getAuth();
    const userRecord = await auth.getUserByEmail(email);
    
    console.log("✅ User found:");
    console.log(`  UID: ${userRecord.uid}`);
    console.log(`  Email: ${userRecord.email}`);
    console.log(`  Email Verified: ${userRecord.emailVerified}`);
    console.log(`  Created: ${userRecord.metadata.creationTime}`);
    
    return userRecord.uid;
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      console.error(`❌ No user found with email: ${email}`);
    } else {
      console.error("❌ Error finding user:", error);
    }
    process.exit(1);
  }
}

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error("Usage: bun run backend/scripts/find-user-by-email.ts <email>");
  process.exit(1);
}

findUserByEmail(args[0]);
