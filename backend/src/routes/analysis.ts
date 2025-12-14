import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth";
import { generateSignedUploadUrl } from "../services/storage";
import {
  createAnalysisJob,
  getAnalysisJob,
  getOrCreateUserData,
  incrementFreeAnalysesUsed,
} from "../services/firestore";
import { enqueueAnalysisTask } from "../services/queue";
import { createError } from "../middleware/errorHandler";

const router = Router();

// Request validation schemas
const createAnalysisSchema = z.object({
  angleHint: z.enum(["side", "front"]).optional(),
  clientMetadata: z
    .object({
      device: z.string().optional(),
      appVersion: z.string().optional(),
    })
    .optional(),
});

/**
 * POST /v1/analysis
 * Create a new analysis job
 */
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Validate request body
    const parsed = createAnalysisSchema.safeParse(req.body);
    if (!parsed.success) {
      throw createError("Invalid request body", "INVALID_REQUEST", 400);
    }

    const { angleHint } = parsed.data;
    const { deviceId, userId } = req;

    if (!deviceId) {
      throw createError("Device ID required", "UNAUTHORIZED", 401);
    }

    // Check entitlements
    const userData = await getOrCreateUserData(deviceId, userId);

    if (!userData.isPro && userData.freeAnalysesUsed >= userData.freeAnalysesLimit) {
      throw createError(
        "Free analyses limit reached. Upgrade to Pro for unlimited access.",
        "PAYWALL_REQUIRED",
        402
      );
    }

    // Generate analysis ID
    const analysisId = uuidv4();

    // Generate signed upload URL
    const { uploadUrl, videoPath } = await generateSignedUploadUrl(analysisId);

    // Create analysis job in Firestore
    await createAnalysisJob(analysisId, {
      deviceId,
      userId,
      angleHint,
      videoPath,
    });

    // Increment usage counter (only for non-pro users)
    if (!userData.isPro) {
      await incrementFreeAnalysesUsed(deviceId, userId);
    }

    // NOTE: We do NOT enqueue the Cloud Task here!
    // The mobile app must:
    // 1. Upload video to signed URL
    // 2. Call POST /v1/analysis/:id/start to begin processing
    // This prevents the race condition where task starts before upload completes

    res.status(201).json({
      analysisId,
      uploadUrl,
      status: "pending_upload",
    });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
      });
    } else {
      console.error("Failed to create analysis:", error);
      res.status(500).json({
        code: "ANALYSIS_FAILED",
        message: "Failed to create analysis job",
      });
    }
  }
});

/**
 * POST /v1/analysis/:id/start
 * Start processing after video upload is complete
 * This must be called AFTER the video has been uploaded to the signed URL
 */
router.post("/:id/start", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { deviceId } = req;

    if (!deviceId) {
      throw createError("Device ID required", "UNAUTHORIZED", 401);
    }

    const job = await getAnalysisJob(id);

    if (!job) {
      throw createError("Analysis not found", "NOT_FOUND", 404);
    }

    // Verify ownership
    if (job.deviceId !== deviceId) {
      throw createError("Unauthorized", "UNAUTHORIZED", 403);
    }

    // Check if already processing or complete
    if (job.status === "processing" || job.status === "complete") {
      res.json({
        status: job.status,
        message: "Analysis already started",
      });
      return;
    }

    // Now enqueue the Cloud Task to process the video
    await enqueueAnalysisTask({
      analysisId: id,
      videoPath: job.videoPath!,
      angleHint: job.angleHint,
      deviceId,
      userId: job.userId,
    });

    res.json({
      status: "queued",
      message: "Analysis started",
    });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
      });
    } else {
      console.error("Failed to start analysis:", error);
      res.status(500).json({
        code: "ANALYSIS_FAILED",
        message: "Failed to start analysis",
      });
    }
  }
});

/**
 * GET /v1/analysis/:id
 * Get analysis status
 */
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { deviceId } = req;

    if (!deviceId) {
      throw createError("Device ID required", "UNAUTHORIZED", 401);
    }

    const job = await getAnalysisJob(id);

    if (!job) {
      throw createError("Analysis not found", "NOT_FOUND", 404);
    }

    // Verify ownership
    if (job.deviceId !== deviceId) {
      throw createError("Unauthorized", "UNAUTHORIZED", 403);
    }

    res.json({
      status: job.status,
      progressStage: job.progressStage,
      error: job.error,
    });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
      });
    } else {
      console.error("Failed to get analysis status:", error);
      res.status(500).json({
        code: "ANALYSIS_FAILED",
        message: "Failed to get analysis status",
      });
    }
  }
});

/**
 * GET /v1/analysis/:id/result
 * Get analysis results
 */
router.get("/:id/result", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { deviceId } = req;

    if (!deviceId) {
      throw createError("Device ID required", "UNAUTHORIZED", 401);
    }

    const job = await getAnalysisJob(id);

    if (!job) {
      throw createError("Analysis not found", "NOT_FOUND", 404);
    }

    // Verify ownership
    if (job.deviceId !== deviceId) {
      throw createError("Unauthorized", "UNAUTHORIZED", 403);
    }

    if (job.status !== "complete") {
      throw createError(
        "Analysis not complete yet",
        "ANALYSIS_IN_PROGRESS",
        425
      );
    }

    res.json({
      coachSummary: job.coachSummary,
      primaryFocus: job.primaryFocus,
      whyItMatters: job.whyItMatters,
      drillRecommendation: job.drillRecommendation,
      correctionCategory: job.correctionCategory,
      sessionId: id,
      priorReferenceText: job.priorReferenceText,
      // NEW: MediaPipe results
      skeletonFrameUrls: job.skeletonFrameUrls || [],
      shootingAngles: job.shootingAngles || null,
    });
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
      });
    } else {
      console.error("Failed to get analysis result:", error);
      res.status(500).json({
        code: "ANALYSIS_FAILED",
        message: "Failed to get analysis result",
      });
    }
  }
});

export default router;
