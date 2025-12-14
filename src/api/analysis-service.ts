import * as Device from "expo-device";
import * as Application from "expo-application";
import * as SecureStore from "expo-secure-store";
import { v4 as uuidv4 } from "uuid";

import {
  createAnalysisJob,
  uploadVideoToSignedUrl,
  startAnalysis,
  getAnalysisStatus,
  getAnalysisResult,
  getEntitlements,
  ApiErrorCodes,
  AnalysisResult,
  AnalysisStatus,
  Entitlements,
} from "./backend-api";

// Device ID key for secure storage
const DEVICE_ID_KEY = "shooting_lab_device_id";

/**
 * Get or create a persistent device ID
 */
export async function getDeviceId(): Promise<string> {
  try {
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);

    if (!deviceId) {
      deviceId = uuidv4();
      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
  } catch {
    // Fallback to a generated ID if secure store fails
    return uuidv4();
  }
}

/**
 * Get client metadata for API requests
 */
function getClientMetadata() {
  return {
    device: Device.modelName || "unknown",
    appVersion: Application.nativeApplicationVersion || "1.0.0",
  };
}

/**
 * Analysis progress callback
 */
export type AnalysisProgressCallback = (status: AnalysisStatus) => void;

/**
 * Full analysis flow:
 * 1. Create analysis job
 * 2. Upload video
 * 3. Poll for completion
 * 4. Return results
 */
export async function runAnalysis(params: {
  videoUri: string;
  angleHint?: "side" | "front";
  token?: string | null;
  onProgress?: AnalysisProgressCallback;
}): Promise<AnalysisResult> {
  const { videoUri, angleHint, token, onProgress } = params;

  const deviceId = await getDeviceId();
  const clientMetadata = getClientMetadata();

  // Step 1: Create analysis job (gets signed URL, does NOT start processing yet)
  onProgress?.({ status: "queued", progressStage: "uploading", progress: 0 });

  const job = await createAnalysisJob({
    angleHint,
    deviceId,
    token,
    clientMetadata,
  });

  // Step 2: Upload video to signed URL
  onProgress?.({ status: "processing", progressStage: "uploading", progress: 20 });

  await uploadVideoToSignedUrl(job.uploadUrl, videoUri);

  // Step 3: Start processing AFTER upload is complete
  // This prevents the race condition where task starts before upload finishes
  onProgress?.({ status: "processing", progressStage: "uploading", progress: 30 });

  await startAnalysis(job.analysisId, { deviceId, token });

  // Step 4: Poll for completion
  const result = await pollAnalysisCompletion(job.analysisId, {
    deviceId,
    token,
    onProgress,
  });

  return result;
}

/**
 * Poll analysis status until complete or failed
 */
async function pollAnalysisCompletion(
  analysisId: string,
  params: {
    deviceId: string;
    token?: string | null;
    onProgress?: AnalysisProgressCallback;
    maxAttempts?: number;
    pollInterval?: number;
  }
): Promise<AnalysisResult> {
  const {
    deviceId,
    token,
    onProgress,
    maxAttempts = 60, // 2 minutes max
    pollInterval = 2000, // 2 seconds
  } = params;

  let attempts = 0;

  while (attempts < maxAttempts) {
    const status = await getAnalysisStatus(analysisId, { deviceId, token });

    // Map progress stage to percentage
    const progressMap: Record<string, number> = {
      uploading: 30,
      extracting_frames: 45,
      pose: 60,
      llm: 80,
      saving: 95,
    };

    if (status.progressStage) {
      onProgress?.({
        ...status,
        progress: progressMap[status.progressStage] || 50,
      });
    }

    if (status.status === "complete") {
      onProgress?.({ status: "complete", progress: 100 });

      // Fetch the results
      return getAnalysisResult(analysisId, { deviceId, token });
    }

    if (status.status === "failed") {
      throw new Error(status.error || "Analysis failed");
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    attempts++;
  }

  throw new Error("Analysis timed out");
}

/**
 * Check if user can perform analysis (entitlement check)
 */
export async function checkCanAnalyze(token?: string | null): Promise<{
  canAnalyze: boolean;
  isPro: boolean;
  remainingFree: number;
  requiresPaywall: boolean;
}> {
  const deviceId = await getDeviceId();

  try {
    const entitlements = await getEntitlements({ deviceId, token });

    return {
      canAnalyze: entitlements.isPro || entitlements.remainingFreeAnalyses > 0,
      isPro: entitlements.isPro,
      remainingFree: entitlements.remainingFreeAnalyses,
      requiresPaywall: !entitlements.isPro && entitlements.remainingFreeAnalyses <= 0,
    };
  } catch (error) {
    // If API fails, allow analysis (fail open for UX)
    console.error("Entitlement check failed:", error);
    return {
      canAnalyze: true,
      isPro: false,
      remainingFree: 1,
      requiresPaywall: false,
    };
  }
}

/**
 * Handle API errors with proper user messaging
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const apiError = error as Error & { code?: string };

    switch (apiError.code) {
      case ApiErrorCodes.PAYWALL_REQUIRED:
        return "You've used your free analyses. Upgrade to Pro for unlimited access.";
      case ApiErrorCodes.ACCOUNT_REQUIRED:
        return "Please create an account to continue.";
      case ApiErrorCodes.ANALYSIS_FAILED:
        return "Unable to analyze the video. Please try recording again with better lighting.";
      case ApiErrorCodes.UPLOAD_FAILED:
        return "Failed to upload video. Please check your connection and try again.";
      case ApiErrorCodes.RATE_LIMITED:
        return "Too many requests. Please wait a moment and try again.";
      default:
        return error.message || "Something went wrong. Please try again.";
    }
  }

  return "An unexpected error occurred. Please try again.";
}
