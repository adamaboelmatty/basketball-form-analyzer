import { Router, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { getUserSessions } from "../services/firestore";
import { createError } from "../middleware/errorHandler";

const router = Router();

/**
 * GET /v1/sessions
 * Get user session history
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deviceId, userId } = req;

    if (!deviceId) {
      throw createError("Device ID required", "UNAUTHORIZED", 401);
    }

    const limit = parseInt(req.query.limit as string) || 50;

    const sessions = await getUserSessions(deviceId, userId, limit);

    // Format sessions for API response
    const formattedSessions = sessions.map((session) => ({
      sessionId: session.sessionId,
      date: session.date.toDate().toISOString(),
      primaryFocus: session.primaryFocus,
      correctionCategory: session.correctionCategory,
      improvementNote: session.improvementNote,
    }));

    res.json(formattedSessions);
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
      });
    } else {
      console.error("Failed to fetch sessions:", error);
      res.status(500).json({
        code: "SESSIONS_FAILED",
        message: "Failed to fetch sessions",
      });
    }
  }
});

export default router;
