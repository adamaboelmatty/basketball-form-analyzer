import { Router, Request, Response } from "express";
import { processAnalysisTask } from "../services/queue";
import { updateProStatus } from "../services/firestore";
import { getAuth } from "firebase-admin/auth";

const router = Router();

/**
 * POST /internal/process-analysis
 * Triggered by Cloud Tasks after video upload
 * This is an internal endpoint not exposed to clients
 */
router.post("/process-analysis", async (req: Request, res: Response) => {
  try {
    const { analysisId, videoPath, angleHint, deviceId, userId } = req.body;

    if (!analysisId || !videoPath || !deviceId) {
      return res.status(400).json({
        code: "INVALID_REQUEST",
        message: "Missing required fields",
      });
    }

    // Process the analysis asynchronously
    // Don't await - let it run in background
    processAnalysisTask({
      analysisId,
      videoPath,
      angleHint,
      deviceId,
      userId,
    }).catch((error) => {
      console.error(`Background processing failed for ${analysisId}:`, error);
    });

    // Respond immediately to Cloud Tasks
    res.status(200).json({ status: "processing" });
  } catch (error) {
    console.error("Failed to process analysis task:", error);
    res.status(500).json({
      code: "PROCESSING_FAILED",
      message: "Failed to process analysis",
    });
  }
});

/**
 * POST /internal/set-pro-status
 * Admin endpoint to set user Pro status by email
 */
router.post("/set-pro-status", async (req: Request, res: Response) => {
  try {
    const { email, isPro } = req.body;

    if (!email) {
      return res.status(400).json({
        code: "INVALID_REQUEST",
        message: "Email is required",
      });
    }

    // Get user by email from Firebase Auth
    const auth = getAuth();
    const userRecord = await auth.getUserByEmail(email);
    const userId = userRecord.uid;

    // Update Pro status in Firestore
    await updateProStatus(userId, isPro !== false, userId);

    console.log(`[admin] Set isPro=${isPro !== false} for ${email} (${userId})`);

    res.json({
      success: true,
      email,
      userId,
      isPro: isPro !== false,
    });
  } catch (error: any) {
    console.error("Failed to set Pro status:", error);
    if (error.code === "auth/user-not-found") {
      res.status(404).json({
        code: "USER_NOT_FOUND",
        message: `No user found with email: ${req.body.email}`,
      });
    } else {
      res.status(500).json({
        code: "UPDATE_FAILED",
        message: error.message || "Failed to set Pro status",
      });
    }
  }
});

export default router;
