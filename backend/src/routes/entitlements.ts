import { Router, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { getOrCreateUserData } from "../services/firestore";
import { createError } from "../middleware/errorHandler";

const router = Router();

/**
 * GET /v1/entitlements
 * Get user entitlements (pro status, free analyses remaining)
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deviceId, userId } = req;

    if (!deviceId) {
      throw createError("Device ID required", "UNAUTHORIZED", 401);
    }

    const userData = await getOrCreateUserData(deviceId, userId);

    const remainingFreeAnalyses = userData.isPro
      ? 0
      : Math.max(0, userData.freeAnalysesLimit - userData.freeAnalysesUsed);

    res.json({
      isPro: userData.isPro,
      remainingFreeAnalyses,
    });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
      });
    } else {
      console.error("Failed to fetch entitlements:", error);
      res.status(500).json({
        code: "ENTITLEMENTS_FAILED",
        message: "Failed to fetch entitlements",
      });
    }
  }
});

export default router;
