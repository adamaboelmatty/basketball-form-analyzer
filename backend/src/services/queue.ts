import { CloudTasksClient } from "@google-cloud/tasks";
import { v4 as uuidv4 } from "uuid";
import type { ShootingAngles } from "./cv/angle_calculator";

const client = new CloudTasksClient();

const projectId = process.env.GCP_PROJECT_ID || "";
const location = process.env.CLOUD_TASKS_LOCATION || "us-central1";
const queue = process.env.CLOUD_TASKS_QUEUE_NAME || "arc-analysis-queue";

/**
 * Create a Cloud Task to process video analysis
 */
export async function enqueueAnalysisTask(params: {
  analysisId: string;
  videoPath: string;
  angleHint?: "side" | "front";
  deviceId: string;
  userId?: string;
}): Promise<void> {
  const { analysisId, videoPath, angleHint, deviceId, userId } = params;

  // Construct the fully qualified queue name
  const parent = client.queuePath(projectId, location, queue);

  // Get the service URL from environment
  const serviceUrl = process.env.CLOUD_RUN_SERVICE_URL || "http://localhost:8080";

  // Task payload
  const payload = {
    analysisId,
    videoPath,
    angleHint,
    deviceId,
    userId,
  };

  // Create the task
  const task = {
    httpRequest: {
      httpMethod: "POST" as const,
      url: `${serviceUrl}/internal/process-analysis`,
      headers: {
        "Content-Type": "application/json",
      },
      body: Buffer.from(JSON.stringify(payload)).toString("base64"),
    },
  };

  try {
    const [response] = await client.createTask({
      parent,
      task,
    });

    console.log(`Created task ${response.name} for analysis ${analysisId}`);
  } catch (error) {
    console.error("Failed to create Cloud Task:", error);
    throw new Error("Failed to enqueue analysis task");
  }
}

/**
 * Process an analysis task (called by Cloud Tasks)
 * This is the worker function that does the actual CV + AI processing
 */
export async function processAnalysisTask(params: {
  analysisId: string;
  videoPath: string;
  angleHint?: "side" | "front";
  deviceId: string;
  userId?: string;
}): Promise<void> {
  const { analysisId, videoPath, angleHint, deviceId, userId } = params;

  console.log(`Processing analysis ${analysisId}`);

  const {
    updateAnalysisStatus,
    saveAnalysisResults,
    saveSession,
    getUserSessions,
  } = await import("./firestore");
  const { downloadVideo } = await import("./storage");
  const { analyzeShootingForm } = await import("./coaching/gemini");
  const { extractShootingFrames } = await import("./cv/video");
  const { runMediaPipePose } = await import("./cv/angle_calculator");
  const { uploadSkeletonFrames, selectKeySkeletonFrames, cleanupSkeletonFrames } = await import("./cv/skeleton_generator");

  const skeletonOutputDir = `/tmp/${analysisId}-skeletons`;

  try {
    // Update status: extracting frames
    await updateAnalysisStatus(analysisId, "processing", "extracting_frames");

    // Download video from GCS to local temp file
    const localVideoPath = `/tmp/${uuidv4()}.mp4`;
    await downloadVideo(videoPath, localVideoPath);

    // Extract frames for analysis
    const framesDir = `/tmp/${analysisId}-frames`;
    const framePaths = await extractShootingFrames(localVideoPath, framesDir);

    console.log(`Extracted ${framePaths.length} frames for analysis ${analysisId}`);

    // Update status: pose estimation with MediaPipe
    await updateAnalysisStatus(analysisId, "processing", "pose");

    // Run MediaPipe pose estimation (Python worker)
    let shootingAngles: ShootingAngles | undefined;
    let skeletonFrameUrls: string[] = [];

    try {
      const poseResult = await runMediaPipePose(framesDir, skeletonOutputDir);
      shootingAngles = poseResult.shootingAngles;
      
      console.log(`MediaPipe analysis complete for ${analysisId}:`, {
        framesAnalyzed: poseResult.framesAnalyzed,
        confidence: shootingAngles.confidence,
        elbowAngle: shootingAngles.elbowAngleAtRelease,
        bodyLean: shootingAngles.bodyLean,
      });

      // Select key skeleton frames and upload to GCS
      const { paths: keyFramePaths } = selectKeySkeletonFrames(
        poseResult.skeletonFramePaths,
        shootingAngles.releaseFrame
      );

      if (keyFramePaths.length > 0) {
        skeletonFrameUrls = await uploadSkeletonFrames(keyFramePaths, analysisId);
        console.log(`Uploaded ${skeletonFrameUrls.length} skeleton frames for ${analysisId}`);
      }
    } catch (poseError) {
      console.warn(`MediaPipe analysis failed for ${analysisId}, continuing without it:`, poseError);
      // Continue without pose data - Gemini can still analyze the video directly
    }

    // Update status: LLM analysis
    await updateAnalysisStatus(analysisId, "processing", "llm");

    // Get previous sessions for continuity
    const sessions = await getUserSessions(deviceId, userId, 5);
    const previousFocus = sessions[0]?.primaryFocus;
    const sessionsOnFocus = sessions.filter(
      (s) => s.primaryFocus === previousFocus
    ).length;

    // Analyze with Gemini 2.5 Flash (using video + structured pose data)
    const analysis = await analyzeShootingForm({
      videoPath: localVideoPath,
      angleHint,
      previousFocus,
      sessionsOnFocus,
      shootingAngles, // NEW: Pass structured angle measurements
    });

    // Update status: saving results
    await updateAnalysisStatus(analysisId, "processing", "saving");

    // Save analysis results with skeleton URLs and angles
    await saveAnalysisResults(analysisId, {
      coachSummary: analysis.coachSummary,
      primaryFocus: analysis.primaryFocus,
      whyItMatters: analysis.whyItMatters,
      drillRecommendation: analysis.drillRecommendation,
      correctionCategory: analysis.correctionCategory,
      // NEW: Include skeleton frames and measurements
      skeletonFrameUrls,
      shootingAngles: shootingAngles ? {
        elbowAngleAtRelease: shootingAngles.elbowAngleAtRelease,
        kneeFlexionAtSetPoint: shootingAngles.kneeFlexionAtSetPoint,
        bodyLean: shootingAngles.bodyLean,
        setPointHeight: shootingAngles.setPointHeight,
      } : undefined,
    });

    // Save session summary
    await saveSession(analysisId, {
      deviceId,
      userId,
      primaryFocus: analysis.primaryFocus,
      correctionCategory: analysis.correctionCategory,
      videoPath,
    });

    // Mark as complete
    await updateAnalysisStatus(analysisId, "complete");

    console.log(`Completed analysis ${analysisId}`);

    // Clean up temp files
    const fs = await import("fs");
    fs.unlinkSync(localVideoPath);

    // Clean up frames directory
    if (fs.existsSync(framesDir)) {
      fs.rmSync(framesDir, { recursive: true, force: true });
    }

    // Clean up skeleton frames
    await cleanupSkeletonFrames(skeletonOutputDir);
  } catch (error) {
    console.error(`Analysis ${analysisId} failed:`, error);

    // Clean up on failure
    try {
      await cleanupSkeletonFrames(skeletonOutputDir);
    } catch {}

    // Mark as failed
    await updateAnalysisStatus(
      analysisId,
      "failed",
      undefined,
      error instanceof Error ? error.message : "Unknown error"
    );

    throw error;
  }
}
