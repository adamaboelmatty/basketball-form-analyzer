/**
 * Skeleton Frame Generator and Uploader
 * 
 * This module handles uploading skeleton-annotated frames to Google Cloud Storage
 * and generating signed URLs for the mobile app to display.
 */

import { Storage } from "@google-cloud/storage";
import * as fs from "fs";
import * as path from "path";

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME || "arc-videos";

/**
 * Upload skeleton frames to GCS and return public URLs
 */
export async function uploadSkeletonFrames(
  skeletonPaths: string[],
  analysisId: string
): Promise<string[]> {
  const bucket = storage.bucket(bucketName);
  const uploadedUrls: string[] = [];

  for (let i = 0; i < skeletonPaths.length; i++) {
    const localPath = skeletonPaths[i];
    
    if (!fs.existsSync(localPath)) {
      console.warn(`Skeleton frame not found: ${localPath}`);
      continue;
    }

    const filename = path.basename(localPath);
    const gcsPath = `skeletons/${analysisId}/${filename}`;
    
    try {
      await bucket.upload(localPath, {
        destination: gcsPath,
        metadata: {
          contentType: "image/jpeg",
          cacheControl: "public, max-age=31536000", // Cache for 1 year
        },
      });

      // Generate signed URL valid for 7 days
      const [signedUrl] = await bucket.file(gcsPath).getSignedUrl({
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      uploadedUrls.push(signedUrl);
    } catch (error) {
      console.error(`Failed to upload skeleton frame ${localPath}:`, error);
    }
  }

  return uploadedUrls;
}

/**
 * Select key skeleton frames for display
 * We don't need all frames - just the important ones
 */
export function selectKeySkeletonFrames(
  allPaths: string[],
  releaseFrame: number
): { paths: string[]; labels: string[] } {
  if (allPaths.length === 0) {
    return { paths: [], labels: [] };
  }

  if (allPaths.length <= 5) {
    // Return all frames with generic labels
    const labels = allPaths.map((_, i) => `Frame ${i + 1}`);
    return { paths: allPaths, labels };
  }

  // Select 5 key frames: setup, lift, set point, release, follow-through
  const totalFrames = allPaths.length;
  const indices = [
    0,                                      // Setup
    Math.floor(totalFrames * 0.25),         // Lift
    Math.max(0, releaseFrame - 2),          // Set point (just before release)
    releaseFrame,                           // Release
    Math.min(totalFrames - 1, releaseFrame + 3), // Follow-through
  ];

  // Remove duplicates while preserving order
  const uniqueIndices = [...new Set(indices)].sort((a, b) => a - b);

  const paths = uniqueIndices.map(i => allPaths[Math.min(i, allPaths.length - 1)]);
  const labels = ["Setup", "Lift", "Set Point", "Release", "Follow-through"].slice(0, uniqueIndices.length);

  return { paths, labels };
}

/**
 * Clean up local skeleton frames after upload
 */
export async function cleanupSkeletonFrames(skeletonDir: string): Promise<void> {
  if (!fs.existsSync(skeletonDir)) {
    return;
  }

  try {
    const files = fs.readdirSync(skeletonDir);
    for (const file of files) {
      fs.unlinkSync(path.join(skeletonDir, file));
    }
    fs.rmdirSync(skeletonDir);
  } catch (error) {
    console.warn(`Failed to cleanup skeleton directory ${skeletonDir}:`, error);
  }
}

/**
 * Frame labels for the skeleton carousel
 */
export const FRAME_LABELS = {
  setup: "Setup",
  lift: "Lift",
  setPoint: "Set Point",
  release: "Release",
  followThrough: "Follow-through",
} as const;

export type FrameLabel = typeof FRAME_LABELS[keyof typeof FRAME_LABELS];
