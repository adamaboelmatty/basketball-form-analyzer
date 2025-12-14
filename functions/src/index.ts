/**
 * Firebase Cloud Function: Link Player on Signup
 *
 * This function automatically links a player record to a Firebase Auth user
 * when they sign up on the iOS app. It matches by email address.
 *
 * Flow:
 * 1. Coach creates a player in the web app with an email (e.g., johndoe@gmail.com)
 * 2. Player downloads iOS app and signs up with the same email
 * 3. This function triggers and links the player document to the new user's UID
 *
 * This enables the coach to see the player's sessions and progress.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();

/**
 * Triggered when a new user is created in Firebase Auth
 * Finds any unlinked player records with matching email and links them
 */
export const linkPlayerOnSignup = functions.auth.user().onCreate(async (user) => {
  const email = user.email?.toLowerCase().trim();

  if (!email) {
    functions.logger.info("No email for user, skipping player link", {
      uid: user.uid,
    });
    return null;
  }

  functions.logger.info("New user signup, checking for matching players", {
    uid: user.uid,
    email: email,
  });

  try {
    // Query for player documents with matching email that aren't already linked
    // We check both lowercase email and the exact email (in case of inconsistent storage)
    const playersSnapshot = await db
      .collection("players")
      .where("email", "==", email)
      .get();

    if (playersSnapshot.empty) {
      // Try with original case email (in case stored differently)
      const altSnapshot = await db
        .collection("players")
        .where("email", "==", user.email)
        .get();

      if (altSnapshot.empty) {
        functions.logger.info("No matching player records found", {
          email: email,
        });
        return null;
      }

      // Filter to only unlinked players
      const unlinkedPlayers = altSnapshot.docs.filter(
        (doc) => !doc.data().playerUid
      );

      if (unlinkedPlayers.length === 0) {
        functions.logger.info("All matching players already linked", {
          email: email,
        });
        return null;
      }

      // Link all matching unlinked players
      const batch = db.batch();
      unlinkedPlayers.forEach((playerDoc) => {
        batch.update(playerDoc.ref, {
          playerUid: user.uid,
          linkedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        functions.logger.info("Linking player to user", {
          playerId: playerDoc.id,
          playerName: playerDoc.data().name,
          teamId: playerDoc.data().teamId,
          uid: user.uid,
        });
      });

      await batch.commit();
      functions.logger.info("Successfully linked players (alt query)", {
        count: unlinkedPlayers.length,
        uid: user.uid,
      });
      return null;
    }

    // Filter to only unlinked players from the primary query
    const unlinkedPlayers = playersSnapshot.docs.filter(
      (doc) => !doc.data().playerUid
    );

    if (unlinkedPlayers.length === 0) {
      functions.logger.info("All matching players already linked", {
        email: email,
        totalMatches: playersSnapshot.size,
      });
      return null;
    }

    // Link all matching unlinked players using a batch write
    const batch = db.batch();
    unlinkedPlayers.forEach((playerDoc) => {
      batch.update(playerDoc.ref, {
        playerUid: user.uid,
        linkedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      functions.logger.info("Linking player to user", {
        playerId: playerDoc.id,
        playerName: playerDoc.data().name,
        teamId: playerDoc.data().teamId,
        uid: user.uid,
      });
    });

    await batch.commit();

    functions.logger.info("Successfully linked players", {
      linkedCount: unlinkedPlayers.length,
      totalMatches: playersSnapshot.size,
      uid: user.uid,
      email: email,
    });

    return null;
  } catch (error) {
    functions.logger.error("Error linking player on signup", {
      uid: user.uid,
      email: email,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
});

/**
 * Optional: Backfill function to link existing users to players
 * Call this once via Firebase Console or CLI to link any users
 * who signed up before this function was deployed
 *
 * Usage: firebase functions:call backfillPlayerLinks
 */
export const backfillPlayerLinks = functions.https.onRequest(async (req, res) => {
  // Only allow POST requests with proper authorization
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  // Simple auth check - you should use a proper secret in production
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).send("Unauthorized");
    return;
  }

  functions.logger.info("Starting backfill of player links");

  try {
    // Get all players - we filter in memory because Firestore can't query for missing fields
    const allPlayersSnapshot = await db.collection("players").get();
    const unlinkedPlayers = allPlayersSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return data.email && !data.playerUid;
    });

    let linkedCount = 0;
    let notFoundCount = 0;

    for (const playerDoc of unlinkedPlayers) {
      const playerData = playerDoc.data();
      const email = playerData.email?.toLowerCase().trim();

      if (!email) continue;

      try {
        // Try to find a Firebase Auth user with this email
        const userRecord = await admin.auth().getUserByEmail(email);

        // Link the player to this user
        await playerDoc.ref.update({
          playerUid: userRecord.uid,
          linkedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        functions.logger.info("Backfill: Linked player", {
          playerId: playerDoc.id,
          playerName: playerData.name,
          uid: userRecord.uid,
        });
        linkedCount++;
      } catch (error: unknown) {
        // User not found in Firebase Auth - that's expected for players
        // who haven't signed up yet
        if ((error as { code?: string }).code === "auth/user-not-found") {
          notFoundCount++;
        } else {
          functions.logger.error("Backfill: Error processing player", {
            playerId: playerDoc.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    const summary = {
      totalUnlinkedPlayers: unlinkedPlayers.length,
      linkedCount,
      notFoundCount,
      errors: unlinkedPlayers.length - linkedCount - notFoundCount,
    };

    functions.logger.info("Backfill complete", summary);
    res.json(summary);
  } catch (error) {
    functions.logger.error("Backfill failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Backfill failed" });
  }
});
