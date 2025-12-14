/**
 * Session Analysis Types
 *
 * These types support the NOAH-lite session analysis feature.
 * Session Analysis answers: "What tendencies do I have over a session?"
 * It produces objective patterns, NOT coaching advice.
 */

// Trend directions for metrics
export type MetricTrend = "higher" | "lower" | "stable";
export type DepthTendency = "short" | "long" | "centered";
export type LeftRightTendency = "left" | "right" | "centered";
export type ConsistencyTrend = "improving" | "mixed" | "unstable";

// Camera angle selection
export type CameraAngle = "side" | "front";

// Rim calibration data from user alignment
export interface RimCalibration {
  rimCenterX: number;
  rimCenterY: number;
  rimRadiusPx: number;
  angle: CameraAngle;
  calibratedAt: string;
}

// Per-attempt metrics (raw, not shown to user)
export interface AttemptMetrics {
  attemptNumber: number;
  arcProxy: number | null;       // (rim_y - peak_ball_y) / rim_radius_px
  depthProxy: number | null;     // (ball_x_at_rim_y - rim_center_x) / rim_radius_px
  leftRightProxy: number | null; // Only available for front angle
  confidence: "high" | "medium" | "low";
}

// Aggregated session metrics (trends only, shown to user)
export interface SessionMetricsSummary {
  arcTrend: MetricTrend;
  depthTendency: DepthTendency;
  leftRightTendency: LeftRightTendency | null; // null if side angle
  consistencyTrend: ConsistencyTrend;
}

// Confidence information
export interface ConfidenceSummary {
  attemptsAnalyzed: number;
  attemptsUnclear: number;
  overallConfidence: "high" | "medium" | "low";
  notes: string[];
}

// Full session analysis result from backend
export interface SessionAnalysisResult {
  sessionId: string;
  analyzedAt: string;

  // Calibration used
  calibration: RimCalibration;

  // Results
  metricsSummary: SessionMetricsSummary;
  confidence: ConfidenceSummary;

  // Raw data (not displayed, used for coach integration)
  rawAttempts?: AttemptMetrics[];

  // Coach bridge - what the coach framework determined from these metrics
  coachFocus?: {
    focusArea: string;
    reasoning: string;
  };
}

// Session analysis request to backend
export interface SessionAnalysisRequest {
  videoUri: string;
  calibration: RimCalibration;
  deviceId: string;
  userId?: string;
  previousSessionId?: string; // For trend comparison
}

// Stored session in history
export interface SessionRecord {
  id: string;
  createdAt: string;
  metricsSummary: SessionMetricsSummary;
  confidence: ConfidenceSummary;
  coachFocus?: string;
}

// Session analysis state
export interface SessionAnalysisState {
  // Current calibration
  currentCalibration: RimCalibration | null;

  // Session history
  sessions: SessionRecord[];

  // Last session for trend comparison
  lastSession: SessionRecord | null;
}
