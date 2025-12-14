/**
 * Pose Analysis Service using Gemini Vision
 * 
 * This module uses Gemini's vision capabilities to analyze body positioning
 * from extracted video frames. This approach is more reliable than trying to
 * run MediaPipe in a Docker container and provides similar quality insights.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

/**
 * Key pose observations for basketball shooting analysis
 */
export interface ShootingPoseObservations {
  // Balance indicators
  stanceWidth: "narrow" | "shoulder_width" | "wide" | "unknown";
  weightDistribution: "heels" | "balanced" | "forward" | "unknown";
  bodyLean: "backward" | "upright" | "forward" | "unknown";
  
  // Shot mechanics
  elbowPosition: "under_ball" | "flared" | "tucked" | "unknown";
  guidingHandPosition: "supporting" | "pushing" | "unknown";
  ballPosition: "shooting_pocket" | "side" | "low" | "unknown";
  
  // Release phase
  setPointHeight: "low" | "forehead" | "above_head" | "unknown";
  followThrough: "extended" | "shortened" | "absent" | "unknown";
  
  // Overall confidence
  confidence: "high" | "medium" | "low";
  
  // Raw observations
  observations: string[];
}

/**
 * Analyze pose from a single frame using Gemini Vision
 */
async function analyzeFramePose(frameBase64: string, frameNumber: number): Promise<string[]> {
  const prompt = `Analyze this basketball shooting frame for body positioning. Be brief and specific.

Look for these key elements:
1. Stance: feet position relative to shoulders
2. Balance: weight on heels vs balls of feet, any lean
3. Elbow: under the ball or flared out?
4. Ball position: in shooting pocket or to the side?
5. Set point: how high is the ball relative to head?
6. Follow-through: arm extended or shortened?

Return ONLY a JSON array of brief observations (2-5 items), like:
["elbow flared to right", "weight on heels", "ball at forehead level"]

If the frame doesn't show enough of the body, return: ["frame_unclear"]`;

  try {
    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: frameBase64,
        },
      },
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as string[];
    }
    
    return ["analysis_failed"];
  } catch (error) {
    console.error(`Frame ${frameNumber} pose analysis failed:`, error);
    return ["analysis_error"];
  }
}

/**
 * Analyze pose from multiple frames and aggregate observations
 */
export async function analyzePoseFromFrames(framePaths: string[]): Promise<ShootingPoseObservations> {
  console.log(`Analyzing pose from ${framePaths.length} frames`);
  
  // Select key frames (start, middle, end of shooting motion)
  const keyFrameIndices = selectKeyFrames(framePaths.length);
  const keyFrames = keyFrameIndices.map(i => framePaths[i]);
  
  const allObservations: string[] = [];
  
  // Analyze each key frame
  for (let i = 0; i < keyFrames.length; i++) {
    const framePath = keyFrames[i];
    try {
      const frameBuffer = fs.readFileSync(framePath);
      const frameBase64 = frameBuffer.toString("base64");
      
      const observations = await analyzeFramePose(frameBase64, i);
      allObservations.push(...observations.filter(o => 
        o !== "frame_unclear" && o !== "analysis_failed" && o !== "analysis_error"
      ));
    } catch (error) {
      console.error(`Failed to read frame ${framePath}:`, error);
    }
  }
  
  // Aggregate observations into structured format
  return aggregateObservations(allObservations);
}

/**
 * Select key frame indices for analysis
 * We want frames from: setup, lift, set point, release, follow-through
 */
function selectKeyFrames(totalFrames: number): number[] {
  if (totalFrames <= 5) {
    return Array.from({ length: totalFrames }, (_, i) => i);
  }
  
  // Select 5 frames distributed across the shooting motion
  const indices = [
    0,                                    // Setup
    Math.floor(totalFrames * 0.25),       // Lift
    Math.floor(totalFrames * 0.5),        // Set point
    Math.floor(totalFrames * 0.75),       // Release
    totalFrames - 1,                      // Follow-through
  ];
  
  return [...new Set(indices)]; // Remove duplicates
}

/**
 * Aggregate individual observations into structured pose data
 */
function aggregateObservations(observations: string[]): ShootingPoseObservations {
  const result: ShootingPoseObservations = {
    stanceWidth: "unknown",
    weightDistribution: "unknown",
    bodyLean: "unknown",
    elbowPosition: "unknown",
    guidingHandPosition: "unknown",
    ballPosition: "unknown",
    setPointHeight: "unknown",
    followThrough: "unknown",
    confidence: observations.length >= 5 ? "high" : observations.length >= 2 ? "medium" : "low",
    observations,
  };
  
  const lowered = observations.map(o => o.toLowerCase());
  
  // Stance analysis
  if (lowered.some(o => o.includes("narrow") || o.includes("feet close"))) {
    result.stanceWidth = "narrow";
  } else if (lowered.some(o => o.includes("wide") || o.includes("feet apart"))) {
    result.stanceWidth = "wide";
  } else if (lowered.some(o => o.includes("shoulder") || o.includes("balanced stance"))) {
    result.stanceWidth = "shoulder_width";
  }
  
  // Weight distribution
  if (lowered.some(o => o.includes("heel") || o.includes("back foot"))) {
    result.weightDistribution = "heels";
  } else if (lowered.some(o => o.includes("forward") || o.includes("toes"))) {
    result.weightDistribution = "forward";
  } else if (lowered.some(o => o.includes("balanced") || o.includes("centered"))) {
    result.weightDistribution = "balanced";
  }
  
  // Body lean
  if (lowered.some(o => o.includes("lean back") || o.includes("falling back") || o.includes("backward lean"))) {
    result.bodyLean = "backward";
  } else if (lowered.some(o => o.includes("lean forward") || o.includes("forward lean"))) {
    result.bodyLean = "forward";
  } else if (lowered.some(o => o.includes("upright") || o.includes("straight spine"))) {
    result.bodyLean = "upright";
  }
  
  // Elbow position
  if (lowered.some(o => o.includes("elbow flare") || o.includes("elbow out") || o.includes("chicken wing"))) {
    result.elbowPosition = "flared";
  } else if (lowered.some(o => o.includes("elbow under") || o.includes("elbow in") || o.includes("elbow aligned"))) {
    result.elbowPosition = "under_ball";
  } else if (lowered.some(o => o.includes("elbow tucked"))) {
    result.elbowPosition = "tucked";
  }
  
  // Guiding hand
  if (lowered.some(o => o.includes("guide hand push") || o.includes("thumb push") || o.includes("two-handed"))) {
    result.guidingHandPosition = "pushing";
  } else if (lowered.some(o => o.includes("guide hand support") || o.includes("off hand"))) {
    result.guidingHandPosition = "supporting";
  }
  
  // Ball position
  if (lowered.some(o => o.includes("shooting pocket") || o.includes("hip to shoulder"))) {
    result.ballPosition = "shooting_pocket";
  } else if (lowered.some(o => o.includes("ball side") || o.includes("ball to the"))) {
    result.ballPosition = "side";
  } else if (lowered.some(o => o.includes("ball low") || o.includes("low start"))) {
    result.ballPosition = "low";
  }
  
  // Set point height
  if (lowered.some(o => o.includes("set point low") || o.includes("below forehead"))) {
    result.setPointHeight = "low";
  } else if (lowered.some(o => o.includes("forehead") || o.includes("eye level"))) {
    result.setPointHeight = "forehead";
  } else if (lowered.some(o => o.includes("above head") || o.includes("high set"))) {
    result.setPointHeight = "above_head";
  }
  
  // Follow-through
  if (lowered.some(o => o.includes("follow through") || o.includes("extended") || o.includes("reach"))) {
    result.followThrough = "extended";
  } else if (lowered.some(o => o.includes("shortened") || o.includes("cut short") || o.includes("pull back"))) {
    result.followThrough = "shortened";
  } else if (lowered.some(o => o.includes("no follow") || o.includes("missing follow"))) {
    result.followThrough = "absent";
  }
  
  return result;
}

/**
 * Generate a text context string from pose observations
 * This is fed to the main coaching prompt for additional context
 */
export function generatePoseContext(pose: ShootingPoseObservations): string {
  if (pose.confidence === "low" || pose.observations.length === 0) {
    return "";
  }
  
  const insights: string[] = [];
  
  // Add structured insights
  if (pose.stanceWidth !== "unknown") {
    insights.push(`Stance: ${pose.stanceWidth.replace("_", " ")}`);
  }
  if (pose.weightDistribution !== "unknown") {
    insights.push(`Weight: ${pose.weightDistribution}`);
  }
  if (pose.bodyLean !== "unknown") {
    insights.push(`Body: ${pose.bodyLean}`);
  }
  if (pose.elbowPosition !== "unknown") {
    insights.push(`Elbow: ${pose.elbowPosition.replace("_", " ")}`);
  }
  if (pose.setPointHeight !== "unknown") {
    insights.push(`Set point: ${pose.setPointHeight.replace("_", " ")}`);
  }
  if (pose.followThrough !== "unknown") {
    insights.push(`Follow-through: ${pose.followThrough}`);
  }
  
  if (insights.length === 0) {
    return "";
  }
  
  return `POSE ANALYSIS CONTEXT:\n${insights.join(" | ")}\n\nRaw observations: ${pose.observations.slice(0, 5).join("; ")}`;
}

/**
 * Quick pose check for a single frame
 * Returns key issues found
 */
export async function quickPoseCheck(framePath: string): Promise<string[]> {
  try {
    const frameBuffer = fs.readFileSync(framePath);
    const frameBase64 = frameBuffer.toString("base64");
    return await analyzeFramePose(frameBase64, 0);
  } catch (error) {
    console.error("Quick pose check failed:", error);
    return [];
  }
}
