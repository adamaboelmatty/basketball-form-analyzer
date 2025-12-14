// Types for the basketball shooting coaching app

export type CorrectionCategory =
  | "balance_verticality"
  | "shot_line_integrity"
  | "set_point_consistency"
  | "release_follow_through";

/**
 * Shooting angles measured from MediaPipe pose estimation
 */
export interface ShootingAngles {
  elbowAngleAtRelease: number;      // Ideal: 85-100°
  kneeFlexionAtSetPoint: number;    // Ideal: 30-45°
  bodyLean: number;                  // Ideal: <5° from vertical
  setPointHeight: number;            // Normalized, 1.0 = head height
}

export interface CoachFeedback {
  coachSummary: string;
  primaryFocus: string;
  whyItMatters: string;
  drillRecommendation: string;
  correctionCategory: CorrectionCategory;
}

export interface CoachingSession {
  id: string;
  date: string;
  videoUri: string;
  feedback: CoachFeedback;
  thumbnailUri?: string;
  // NEW: MediaPipe analysis results
  skeletonFrameUrls?: string[];
  shootingAngles?: ShootingAngles;
}

export interface UserProgress {
  currentFocus: CorrectionCategory | null;
  focusStartDate: string | null;
  sessionsOnCurrentFocus: number;
  totalAnalyses: number;
  isPro: boolean;
}

// Priority order for corrections (higher index = lower priority)
export const CORRECTION_PRIORITY: CorrectionCategory[] = [
  "balance_verticality",
  "shot_line_integrity",
  "set_point_consistency",
  "release_follow_through",
];

export const CORRECTION_LABELS: Record<CorrectionCategory, string> = {
  balance_verticality: "Balance & Verticality",
  shot_line_integrity: "Shot Line Integrity",
  set_point_consistency: "Set Point Consistency",
  release_follow_through: "Release & Follow-Through",
};

export const FREE_ANALYSIS_LIMIT = 1;
export const PRO_MONTHLY_SOFT_CAP = 20;
