import { Router, Response } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth";
import { updateProStatus } from "../services/firestore";
import { createError } from "../middleware/errorHandler";

const router = Router();

// Request validation schema
const syncPurchaseSchema = z.object({
  receiptData: z.string().optional(), // For future use
});

/**
 * POST /v1/purchases/sync
 * Sync RevenueCat purchase with backend
 * For now, this simply marks the user as Pro
 * In the future, we can verify the purchase with RevenueCat's API
 */
router.post("/sync", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = syncPurchaseSchema.safeParse(req.body);
    if (!parsed.success) {
      throw createError("Invalid request body", "INVALID_REQUEST", 400);
    }

    const { deviceId, userId } = req;

    if (!deviceId) {
      throw createError("Device ID required", "UNAUTHORIZED", 401);
    }

    // Mark user as Pro in Firestore
    await updateProStatus(deviceId, true, userId);

    console.log(`[purchases] User ${userId || deviceId} upgraded to Pro`);

    // Return updated entitlements
    res.json({
      isPro: true,
      remainingFreeAnalyses: 0,
    });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
      });
    } else {
      console.error("Failed to sync purchase:", error);
      res.status(500).json({
        code: "SYNC_FAILED",
        message: "Failed to sync purchase",
      });
    }
  }
});

export default router;
