// Backend API Configuration
// The backend should be deployed to Cloud Run with the following services:
// - Video upload to GCS
// - Frame extraction with FFmpeg
// - Pose extraction with MediaPipe
// - Coach output with Gemini
// - Langfuse tracing

// Base URL - should be set in environment variable
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "https://api.arc.app";

// Debug: Log the API URL on module load
console.log("[backend-api] API_BASE_URL:", API_BASE_URL);

// Types for API responses
export interface AnalysisJob {
  analysisId: string;
  uploadUrl: string; // Signed URL for video upload
  status: "queued" | "processing" | "complete" | "failed";
}

export interface AnalysisStatus {
  status: "queued" | "processing" | "complete" | "failed";
  progressStage?: "uploading" | "extracting_frames" | "pose" | "llm" | "saving";
  progress?: number; // 0-100
  error?: string;
}

export interface ShootingAnglesMeasurements {
  elbowAngleAtRelease: number;
  kneeFlexionAtSetPoint: number;
  bodyLean: number;
  setPointHeight: number;
}

export interface AnalysisResult {
  coachSummary: string;
  primaryFocus: string;
  whyItMatters: string;
  drillRecommendation: string;
  correctionCategory: string;
  sessionId: string;
  priorReferenceText?: string;
  // NEW: MediaPipe results
  skeletonFrameUrls: string[];
  shootingAngles: ShootingAnglesMeasurements | null;
}

export interface SessionSummary {
  sessionId: string;
  date: string;
  primaryFocus: string;
  correctionCategory: string;
  improvementNote?: string;
}

export interface Entitlements {
  isPro: boolean;
  remainingFreeAnalyses: number;
}

export interface ApiError {
  code: string;
  message: string;
}

// Helper to get auth headers
async function getAuthHeaders(token?: string | null): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

// Helper for API requests
async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    token?: string | null;
    deviceId?: string;
  } = {}
): Promise<T> {
  const { method = "GET", body, token, deviceId } = options;

  const headers = await getAuthHeaders(token);

  // Add device ID for anonymous users
  if (deviceId) {
    headers["X-Device-ID"] = deviceId;
  }

  const fullUrl = `${API_BASE_URL}${endpoint}`;
  console.log(`[backend-api] ${method} ${fullUrl}`);
  console.log(`[backend-api] Headers:`, JSON.stringify(headers));

  const response = await fetch(fullUrl, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  console.log(`[backend-api] Response status: ${response.status}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.log("[backend-api] API Error:", response.status, errorData);
    const error = new Error(errorData.message || "API request failed") as Error & { code?: string };
    error.code = errorData.code;
    throw error;
  }

  return response.json();
}

/**
 * Create a new analysis job
 * Returns a signed URL for video upload and an analysis ID
 */
export async function createAnalysisJob(params: {
  angleHint?: "side" | "front";
  deviceId: string;
  token?: string | null;
  clientMetadata?: {
    device?: string;
    appVersion?: string;
  };
}): Promise<AnalysisJob> {
  const { angleHint, deviceId, token, clientMetadata } = params;

  console.log("[backend-api] Creating analysis job with:", { deviceId, hasToken: !!token, angleHint });

  return apiRequest<AnalysisJob>("/v1/analysis", {
    method: "POST",
    body: {
      angleHint,
      clientMetadata,
    },
    token,
    deviceId,
  });
}

/**
 * Upload video to the signed URL
 */
export async function uploadVideoToSignedUrl(
  signedUrl: string,
  videoUri: string
): Promise<void> {
  console.log("[backend-api] Starting video upload...");
  
  // Read the video file
  const response = await fetch(videoUri);
  const blob = await response.blob();

  console.log("[backend-api] Video blob size:", blob.size);

  // Upload to signed URL
  const uploadResponse = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
    },
    body: blob,
  });

  if (!uploadResponse.ok) {
    console.error("[backend-api] Upload failed:", uploadResponse.status);
    throw new Error("Failed to upload video");
  }

  console.log("[backend-api] Video upload complete");
}

/**
 * Start analysis processing after video upload
 * This must be called AFTER uploading the video to the signed URL
 */
export async function startAnalysis(
  analysisId: string,
  params: {
    deviceId: string;
    token?: string | null;
  }
): Promise<{ status: string; message: string }> {
  const { deviceId, token } = params;

  const endpoint = `/v1/analysis/${analysisId}/start`;
  console.log("[backend-api] ===== START ANALYSIS =====");
  console.log("[backend-api] Analysis ID:", analysisId);
  console.log("[backend-api] Endpoint:", endpoint);
  console.log("[backend-api] Full URL will be:", `${API_BASE_URL}${endpoint}`);

  return apiRequest<{ status: string; message: string }>(endpoint, {
    method: "POST",
    token,
    deviceId,
  });
}

/**
 * Check analysis status
 */
export async function getAnalysisStatus(
  analysisId: string,
  params: {
    deviceId: string;
    token?: string | null;
  }
): Promise<AnalysisStatus> {
  const { deviceId, token } = params;

  return apiRequest<AnalysisStatus>(`/v1/analysis/${analysisId}`, {
    token,
    deviceId,
  });
}

/**
 * Get analysis results
 */
export async function getAnalysisResult(
  analysisId: string,
  params: {
    deviceId: string;
    token?: string | null;
  }
): Promise<AnalysisResult> {
  const { deviceId, token } = params;

  return apiRequest<AnalysisResult>(`/v1/analysis/${analysisId}/result`, {
    token,
    deviceId,
  });
}

/**
 * Get user sessions list
 */
export async function getSessions(params: {
  limit?: number;
  deviceId: string;
  token?: string | null;
}): Promise<SessionSummary[]> {
  const { limit = 50, deviceId, token } = params;

  return apiRequest<SessionSummary[]>(`/v1/sessions?limit=${limit}`, {
    token,
    deviceId,
  });
}

/**
 * Get user entitlements
 */
export async function getEntitlements(params: {
  deviceId: string;
  token?: string | null;
}): Promise<Entitlements> {
  const { deviceId, token } = params;

  return apiRequest<Entitlements>("/v1/entitlements", {
    token,
    deviceId,
  });
}

/**
 * Sync purchase with backend (after RevenueCat purchase)
 */
export async function syncPurchase(params: {
  receiptData: string;
  deviceId: string;
  token?: string | null;
}): Promise<Entitlements> {
  const { receiptData, deviceId, token } = params;

  return apiRequest<Entitlements>("/v1/purchases/sync", {
    method: "POST",
    body: { receiptData },
    token,
    deviceId,
  });
}

// Error codes from backend
export const ApiErrorCodes = {
  PAYWALL_REQUIRED: "PAYWALL_REQUIRED",
  ACCOUNT_REQUIRED: "ACCOUNT_REQUIRED",
  ANALYSIS_FAILED: "ANALYSIS_FAILED",
  UPLOAD_FAILED: "UPLOAD_FAILED",
  RATE_LIMITED: "RATE_LIMITED",
  UNAUTHORIZED: "UNAUTHORIZED",
} as const;
