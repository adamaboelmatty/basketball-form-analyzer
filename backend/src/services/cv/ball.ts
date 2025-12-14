// Computer Vision features temporarily disabled for deployment
// Will be re-enabled once Docker build is properly configured for OpenCV

import * as fs from "fs";

/**
 * Ball detection result for a single frame
 */
export interface BallDetection {
  x: number; // Normalized x position (0-1)
  y: number; // Normalized y position (0-1)
  radius: number; // Normalized radius
  confidence: number; // Detection confidence (0-1)
}

/**
 * Rim detection result
 */
export interface RimDetection {
  centerX: number; // Normalized x position (0-1)
  centerY: number; // Normalized y position (0-1)
  radius: number; // Normalized radius
  confidence: number;
}

/**
 * Shot trajectory analysis
 */
export interface ShotTrajectory {
  ballPath: BallDetection[];
  arcHeight: number; // Peak height of shot
  arcTrend: "higher" | "lower" | "stable";
  depthTendency: "short" | "long" | "centered";
  leftRightTendency: "left" | "right" | "centered" | null;
  made: boolean; // Did the shot go in?
}

/**
 * Session analysis metrics
 */
export interface SessionMetrics {
  shots: ShotTrajectory[];
  summary: {
    totalShots: number;
    shotsMade: number;
    arcTrend: "higher" | "lower" | "stable";
    depthTendency: "short" | "long" | "centered";
    leftRightTendency: "left" | "right" | "centered" | null;
    consistencyTrend: "improving" | "mixed" | "unstable";
  };
}

/**
 * Detect basketball in frame using color and shape detection
 * TEMPORARILY DISABLED - Will be re-enabled after Docker build configuration
 */
export function detectBall(
  frame: any,
  previousDetection?: BallDetection
): BallDetection | null {
  console.log("Ball detection temporarily disabled");
  return null;
}

/**
 * Detect rim in frame using circular Hough transform
 * TEMPORARILY DISABLED - Will be re-enabled after Docker build configuration
 */
export function detectRim(frame: any, calibration?: RimDetection): RimDetection | null {
  console.log("Rim detection temporarily disabled");
  return null;
}

/**
 * Track ball through sequence of frames
 * TEMPORARILY DISABLED - Will be re-enabled after Docker build configuration
 */
export async function trackBallInFrames(
  framePaths: string[],
  rimCalibration?: RimDetection
): Promise<BallDetection[]> {
  console.log("Ball tracking temporarily disabled");
  return [];
}

/**
 * Analyze shot trajectory from ball path
 */
export function analyzeShotTrajectory(
  ballPath: BallDetection[],
  rim: RimDetection
): ShotTrajectory {
  return {
    ballPath: [],
    arcHeight: 0,
    arcTrend: "stable",
    depthTendency: "centered",
    leftRightTendency: null,
    made: false,
  };
}

/**
 * Analyze full session from multiple shot videos
 */
export async function analyzeSession(
  shotFramePaths: string[][], // Array of frame path arrays (one per shot)
  rimCalibration: RimDetection
): Promise<SessionMetrics> {
  console.log("Session analysis temporarily disabled");

  return {
    shots: [],
    summary: {
      totalShots: 0,
      shotsMade: 0,
      arcTrend: "stable",
      depthTendency: "centered",
      leftRightTendency: null,
      consistencyTrend: "mixed",
    },
  };
}
