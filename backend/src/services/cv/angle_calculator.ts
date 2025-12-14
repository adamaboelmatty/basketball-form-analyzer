/**
 * Angle Calculator for Basketball Shooting Analysis
 * 
 * This module provides TypeScript interfaces and functions for working with
 * pose data from MediaPipe. It wraps the Python MediaPipe worker and provides
 * typed access to shooting angle measurements.
 */

import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";

/**
 * 2D/3D Point representation from pose landmarks
 */
export interface Point {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/**
 * Shooting angles calculated from pose estimation
 */
export interface ShootingAngles {
  elbowAngleAtRelease: number;      // Ideal: 85-100°
  kneeFlexionAtSetPoint: number;    // Ideal: 30-45°
  bodyLean: number;                  // Ideal: <5° from vertical
  setPointHeight: number;            // Normalized, 1.0 = head height
  releaseFrame: number;              // Frame number of detected release
  confidence: "high" | "medium" | "low";
}

/**
 * Per-frame pose data
 */
export interface FramePoseData {
  frameNumber: number;
  elbowAngle: number | null;
  kneeFlexion: number | null;
  shoulderAngle: number | null;
  bodyLean: number | null;
  wristHeightNormalized: number | null;
}

/**
 * Complete pose analysis result from MediaPipe
 */
export interface PoseAnalysisResult {
  framesAnalyzed: number;
  totalFrames: number;
  shootingAngles: ShootingAngles;
  skeletonFramePaths: string[];
  framesData: FramePoseData[];
}

/**
 * Ideal ranges for shooting mechanics
 */
export const IDEAL_RANGES = {
  elbowAngle: { min: 85, max: 100, unit: "°" },
  kneeFlexion: { min: 30, max: 45, unit: "°" },
  bodyLean: { min: -5, max: 5, unit: "°" },
  setPointHeight: { min: 1.0, max: 1.5, unit: "" },
};

/**
 * Calculate angle between three points (angle at point b)
 */
export function calculateAngle(a: Point, b: Point, c: Point): number {
  // Vector BA and BC
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };

  // Dot product
  const dot = ba.x * bc.x + ba.y * bc.y;

  // Magnitudes
  const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
  const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);

  if (magBA === 0 || magBC === 0) {
    return 0;
  }

  // Clamp to avoid Math.acos domain errors
  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));

  // Return angle in degrees
  return Math.acos(cosAngle) * (180 / Math.PI);
}

/**
 * Check if an angle is within the ideal range
 */
export function isInIdealRange(
  value: number,
  metric: keyof typeof IDEAL_RANGES
): { inRange: boolean; deviation: number; status: "good" | "close" | "needs_work" } {
  const range = IDEAL_RANGES[metric];
  
  if (value >= range.min && value <= range.max) {
    return { inRange: true, deviation: 0, status: "good" };
  }
  
  const deviation = value < range.min 
    ? range.min - value 
    : value - range.max;
  
  // Within 10% of range is "close"
  const rangeSize = range.max - range.min;
  const closeThreshold = rangeSize * 0.5;
  
  return {
    inRange: false,
    deviation: Math.round(deviation * 10) / 10,
    status: deviation <= closeThreshold ? "close" : "needs_work"
  };
}

/**
 * Generate a human-readable assessment of the shooting angles
 */
export function assessShootingAngles(angles: ShootingAngles): {
  metric: string;
  value: number;
  ideal: string;
  status: "good" | "close" | "needs_work";
  feedback: string;
}[] {
  const assessments = [];

  // Elbow angle
  const elbowCheck = isInIdealRange(angles.elbowAngleAtRelease, "elbowAngle");
  assessments.push({
    metric: "Elbow Angle at Release",
    value: angles.elbowAngleAtRelease,
    ideal: `${IDEAL_RANGES.elbowAngle.min}-${IDEAL_RANGES.elbowAngle.max}°`,
    status: elbowCheck.status,
    feedback: elbowCheck.inRange
      ? "Good elbow position"
      : angles.elbowAngleAtRelease < IDEAL_RANGES.elbowAngle.min
      ? "Elbow is flared out - keep it more under the ball"
      : "Elbow is too tucked - allow more extension"
  });

  // Knee flexion
  const kneeCheck = isInIdealRange(angles.kneeFlexionAtSetPoint, "kneeFlexion");
  assessments.push({
    metric: "Knee Flexion at Set Point",
    value: angles.kneeFlexionAtSetPoint,
    ideal: `${IDEAL_RANGES.kneeFlexion.min}-${IDEAL_RANGES.kneeFlexion.max}°`,
    status: kneeCheck.status,
    feedback: kneeCheck.inRange
      ? "Good leg load"
      : angles.kneeFlexionAtSetPoint < IDEAL_RANGES.kneeFlexion.min
      ? "Legs too straight - bend knees more for power"
      : "Knees too bent - you're losing upward momentum"
  });

  // Body lean
  const leanCheck = isInIdealRange(Math.abs(angles.bodyLean), "bodyLean");
  assessments.push({
    metric: "Body Lean",
    value: angles.bodyLean,
    ideal: "<5° from vertical",
    status: leanCheck.status,
    feedback: leanCheck.inRange
      ? "Good balance"
      : angles.bodyLean > 5
      ? "Leaning backward - stay more vertical"
      : "Leaning forward - stay more vertical"
  });

  // Set point height
  const heightCheck = isInIdealRange(angles.setPointHeight, "setPointHeight");
  assessments.push({
    metric: "Set Point Height",
    value: angles.setPointHeight,
    ideal: ">1.0 (above forehead)",
    status: heightCheck.status,
    feedback: heightCheck.inRange
      ? "Good set point height"
      : "Set point too low - raise the ball higher before release"
  });

  return assessments;
}

/**
 * Run MediaPipe pose analysis on extracted frames
 * Calls the Python MediaPipe worker script
 */
export async function runMediaPipePose(
  framesDir: string,
  outputDir: string
): Promise<PoseAnalysisResult> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, "mediapipe_worker.py");
    
    // Check if Python script exists
    if (!fs.existsSync(pythonScript)) {
      reject(new Error(`MediaPipe worker not found: ${pythonScript}`));
      return;
    }

    const pythonProcess = spawn("python3", [
      pythonScript,
      "--frames-dir", framesDir,
      "--output-dir", outputDir
    ]);

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error("MediaPipe worker stderr:", stderr);
        reject(new Error(`MediaPipe worker failed with code ${code}: ${stderr}`));
        return;
      }

      try {
        // Parse the JSON output from Python
        const result = JSON.parse(stdout);
        
        // Convert snake_case to camelCase
        const poseResult: PoseAnalysisResult = {
          framesAnalyzed: result.frames_analyzed,
          totalFrames: result.total_frames,
          shootingAngles: {
            elbowAngleAtRelease: result.shooting_angles.elbow_angle_at_release,
            kneeFlexionAtSetPoint: result.shooting_angles.knee_flexion_at_set_point,
            bodyLean: result.shooting_angles.body_lean,
            setPointHeight: result.shooting_angles.set_point_height,
            releaseFrame: result.shooting_angles.release_frame,
            confidence: result.shooting_angles.confidence,
          },
          skeletonFramePaths: result.skeleton_frame_paths,
          framesData: result.frames_data.map((fd: any) => ({
            frameNumber: fd.frame_number,
            elbowAngle: fd.elbow_angle,
            kneeFlexion: fd.knee_flexion,
            shoulderAngle: fd.shoulder_angle,
            bodyLean: fd.body_lean,
            wristHeightNormalized: fd.wrist_height_normalized,
          })),
        };

        resolve(poseResult);
      } catch (parseError) {
        console.error("Failed to parse MediaPipe output:", stdout);
        reject(new Error(`Failed to parse MediaPipe output: ${parseError}`));
      }
    });

    pythonProcess.on("error", (err) => {
      reject(new Error(`Failed to start MediaPipe worker: ${err.message}`));
    });
  });
}

/**
 * Format shooting angles for inclusion in the Gemini prompt
 */
export function formatAnglesForPrompt(angles: ShootingAngles): string {
  const lines = [
    "═══════════════════════════════════════════════════════════",
    "MEASURED POSE DATA",
    "═══════════════════════════════════════════════════════════",
    "",
    `Elbow angle at release: ${angles.elbowAngleAtRelease}° (ideal: 85-100°)`,
    `Knee flexion at set point: ${angles.kneeFlexionAtSetPoint}° (ideal: 30-45°)`,
    `Body lean from vertical: ${angles.bodyLean}° (ideal: <5°)`,
    `Set point height: ${angles.setPointHeight.toFixed(2)} (1.0 = head height, >1.0 = above head)`,
    `Analysis confidence: ${angles.confidence}`,
    "",
    "Use these measurements to give precise, actionable feedback.",
    "Reference specific angles when helpful.",
  ];
  
  return lines.join("\n");
}
