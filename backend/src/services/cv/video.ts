import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import * as path from "path";

/**
 * Extract frames from video at specified intervals
 */
export async function extractFrames(
  videoPath: string,
  outputDir: string,
  options: {
    fps?: number; // Frames per second to extract
    maxFrames?: number; // Maximum number of frames
    quality?: number; // JPEG quality 1-31 (lower is better)
  } = {}
): Promise<string[]> {
  const { fps = 10, maxFrames = 30, quality = 2 } = options;

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const framePaths: string[] = [];
    let frameCount = 0;

    ffmpeg(videoPath)
      .outputOptions([
        `-vf fps=${fps}`, // Extract frames at specified FPS
        `-q:v ${quality}`, // JPEG quality
      ])
      .output(path.join(outputDir, "frame-%04d.jpg"))
      .on("end", () => {
        // Get all extracted frame paths
        const files = fs.readdirSync(outputDir);
        const sortedFrames = files
          .filter((f) => f.startsWith("frame-") && f.endsWith(".jpg"))
          .sort()
          .slice(0, maxFrames)
          .map((f) => path.join(outputDir, f));

        resolve(sortedFrames);
      })
      .on("error", (err) => {
        console.error("FFmpeg frame extraction failed:", err);
        reject(new Error(`Frame extraction failed: ${err.message}`));
      })
      .run();
  });
}

/**
 * Get video metadata
 */
export async function getVideoMetadata(
  videoPath: string
): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to get video metadata: ${err.message}`));
        return;
      }

      const videoStream = metadata.streams.find((s) => s.codec_type === "video");

      if (!videoStream) {
        reject(new Error("No video stream found"));
        return;
      }

      // Parse FPS from r_frame_rate (e.g., "30/1" -> 30)
      const fpsMatch = videoStream.r_frame_rate?.match(/(\d+)\/(\d+)/);
      const fps = fpsMatch ? parseInt(fpsMatch[1]) / parseInt(fpsMatch[2]) : 30;

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        fps,
        codec: videoStream.codec_name || "unknown",
      });
    });
  });
}

/**
 * Extract key frames for shooting analysis
 * Focuses on the shooting motion (first 5 seconds)
 */
export async function extractShootingFrames(
  videoPath: string,
  outputDir: string
): Promise<string[]> {
  // Get video metadata first
  const metadata = await getVideoMetadata(videoPath);

  // For shooting analysis, we want:
  // - Higher FPS for better motion capture (15 fps)
  // - Focus on first 5 seconds (shooting motion is quick)
  // - Max 50 frames to keep processing fast

  const fps = Math.min(15, metadata.fps); // Don't exceed video FPS
  const maxFrames = Math.min(50, Math.floor(fps * 5)); // 5 seconds of frames

  return extractFrames(videoPath, outputDir, {
    fps,
    maxFrames,
    quality: 2, // High quality for pose detection
  });
}

/**
 * Create a thumbnail from video (for preview)
 */
export async function createThumbnail(
  videoPath: string,
  outputPath: string,
  timestamp: string = "00:00:01" // 1 second into video
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: "640x480",
      })
      .on("end", () => resolve())
      .on("error", (err) => {
        reject(new Error(`Thumbnail creation failed: ${err.message}`));
      });
  });
}

/**
 * Compress video for storage optimization
 */
export async function compressVideo(
  inputPath: string,
  outputPath: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    bitrate?: string;
  } = {}
): Promise<void> {
  const { maxWidth = 1280, maxHeight = 720, bitrate = "1000k" } = options;

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        `-vf scale=${maxWidth}:${maxHeight}:force_original_aspect_ratio=decrease`,
        `-b:v ${bitrate}`,
        "-c:v libx264",
        "-preset fast",
        "-c:a aac",
        "-b:a 128k",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => {
        reject(new Error(`Video compression failed: ${err.message}`));
      })
      .run();
  });
}

/**
 * Extract audio from video (for future audio analysis)
 */
export async function extractAudio(
  videoPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions(["-vn", "-acodec libmp3lame", "-q:a 2"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => {
        reject(new Error(`Audio extraction failed: ${err.message}`));
      })
      .run();
  });
}
