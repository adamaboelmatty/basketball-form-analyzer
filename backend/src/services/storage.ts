import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
});

const bucketName = process.env.GCS_BUCKET_NAME || "arc-videos";
const bucket = storage.bucket(bucketName);

export interface SignedUploadUrl {
  uploadUrl: string;
  videoPath: string;
}

/**
 * Generate a signed URL for video upload
 * Returns a URL that the client can PUT the video to
 */
export async function generateSignedUploadUrl(
  analysisId: string,
  contentType: string = "video/mp4"
): Promise<SignedUploadUrl> {
  const videoPath = `videos/${analysisId}/${uuidv4()}.mp4`;
  const file = bucket.file(videoPath);

  const expiryMinutes = parseInt(process.env.GCS_SIGNED_URL_EXPIRY || "60");

  const [uploadUrl] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + expiryMinutes * 60 * 1000,
    contentType,
  });

  return {
    uploadUrl,
    videoPath,
  };
}

/**
 * Get a signed URL for video download/viewing
 */
export async function generateSignedDownloadUrl(
  videoPath: string,
  expiryMinutes: number = 60
): Promise<string> {
  const file = bucket.file(videoPath);

  const [downloadUrl] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + expiryMinutes * 60 * 1000,
  });

  return downloadUrl;
}

/**
 * Check if video exists in storage
 */
export async function videoExists(videoPath: string): Promise<boolean> {
  const file = bucket.file(videoPath);
  const [exists] = await file.exists();
  return exists;
}

/**
 * Download video to local path (for CV processing)
 */
export async function downloadVideo(
  videoPath: string,
  destination: string
): Promise<void> {
  const file = bucket.file(videoPath);
  await file.download({ destination });
}

/**
 * Delete video from storage
 */
export async function deleteVideo(videoPath: string): Promise<void> {
  const file = bucket.file(videoPath);
  await file.delete();
}

/**
 * Get video metadata
 */
export async function getVideoMetadata(videoPath: string) {
  const file = bucket.file(videoPath);
  const [metadata] = await file.getMetadata();
  return {
    size: metadata.size,
    contentType: metadata.contentType,
    created: metadata.timeCreated,
    updated: metadata.updated,
  };
}
