import { Firestore, Timestamp, FieldValue } from "@google-cloud/firestore";

const firestore = new Firestore({
  projectId: process.env.GCP_PROJECT_ID,
  ignoreUndefinedProperties: true, // Allow undefined values in documents
});

// Collections
const ANALYSIS_COLLECTION = "analyses";
const USERS_COLLECTION = "users";
const SESSIONS_COLLECTION = "sessions";

export type AnalysisStatus = "queued" | "processing" | "complete" | "failed";
export type ProgressStage = "uploading" | "extracting_frames" | "pose" | "llm" | "saving";

export interface ShootingAnglesMeasurements {
  elbowAngleAtRelease: number;
  kneeFlexionAtSetPoint: number;
  bodyLean: number;
  setPointHeight: number;
}

export interface AnalysisJob {
  analysisId: string;
  userId?: string;
  deviceId: string;
  status: AnalysisStatus;
  progressStage?: ProgressStage;
  videoPath?: string;
  angleHint?: "side" | "front";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  error?: string;
  // Results (populated when complete)
  coachSummary?: string;
  primaryFocus?: string;
  whyItMatters?: string;
  drillRecommendation?: string;
  correctionCategory?: string;
  priorReferenceText?: string;
  // NEW: MediaPipe results
  skeletonFrameUrls?: string[];
  shootingAngles?: ShootingAnglesMeasurements;
}

export interface UserData {
  deviceId: string;
  userId?: string;
  isPro: boolean;
  freeAnalysesUsed: number;
  freeAnalysesLimit: number;
  createdAt: Timestamp;
  lastAnalysisAt?: Timestamp;
}

export interface SessionSummary {
  sessionId: string;
  userId?: string;
  deviceId: string;
  date: Timestamp;
  primaryFocus: string;
  correctionCategory: string;
  improvementNote?: string;
  videoPath: string;
}

/**
 * Create a new analysis job
 */
export async function createAnalysisJob(
  analysisId: string,
  params: {
    deviceId: string;
    userId?: string;
    angleHint?: "side" | "front";
    videoPath: string;
  }
): Promise<AnalysisJob> {
  const now = Timestamp.now();

  const job: AnalysisJob = {
    analysisId,
    deviceId: params.deviceId,
    userId: params.userId,
    status: "queued",
    angleHint: params.angleHint,
    videoPath: params.videoPath,
    createdAt: now,
    updatedAt: now,
  };

  await firestore.collection(ANALYSIS_COLLECTION).doc(analysisId).set(job);

  return job;
}

/**
 * Update analysis job status
 */
export async function updateAnalysisStatus(
  analysisId: string,
  status: AnalysisStatus,
  progressStage?: ProgressStage,
  error?: string
): Promise<void> {
  const updates: Partial<AnalysisJob> = {
    status,
    progressStage,
    updatedAt: Timestamp.now(),
  };

  if (error) {
    updates.error = error;
  }

  await firestore
    .collection(ANALYSIS_COLLECTION)
    .doc(analysisId)
    .update(updates);
}

/**
 * Save analysis results
 */
export async function saveAnalysisResults(
  analysisId: string,
  results: {
    coachSummary: string;
    primaryFocus: string;
    whyItMatters: string;
    drillRecommendation: string;
    correctionCategory: string;
    priorReferenceText?: string;
    // NEW: MediaPipe results
    skeletonFrameUrls?: string[];
    shootingAngles?: ShootingAnglesMeasurements;
  }
): Promise<void> {
  await firestore
    .collection(ANALYSIS_COLLECTION)
    .doc(analysisId)
    .update({
      status: "complete" as AnalysisStatus,
      ...results,
      updatedAt: Timestamp.now(),
    });
}

/**
 * Get analysis job by ID
 */
export async function getAnalysisJob(
  analysisId: string
): Promise<AnalysisJob | null> {
  const doc = await firestore
    .collection(ANALYSIS_COLLECTION)
    .doc(analysisId)
    .get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as AnalysisJob;
}

/**
 * Get or create user data
 */
export async function getOrCreateUserData(
  deviceId: string,
  userId?: string
): Promise<UserData> {
  const docId = userId || deviceId;
  const userRef = firestore.collection(USERS_COLLECTION).doc(docId);
  const doc = await userRef.get();

  if (doc.exists) {
    return doc.data() as UserData;
  }

  // Create new user
  const userData: UserData = {
    deviceId,
    userId,
    isPro: false,
    freeAnalysesUsed: 0,
    freeAnalysesLimit: 1,
    createdAt: Timestamp.now(),
  };

  await userRef.set(userData);
  return userData;
}

/**
 * Increment free analyses used
 */
export async function incrementFreeAnalysesUsed(
  deviceId: string,
  userId?: string
): Promise<void> {
  const docId = userId || deviceId;
  const userRef = firestore.collection(USERS_COLLECTION).doc(docId);

  await userRef.update({
    freeAnalysesUsed: FieldValue.increment(1),
    lastAnalysisAt: Timestamp.now(),
  });
}

/**
 * Update user pro status
 */
export async function updateProStatus(
  deviceId: string,
  isPro: boolean,
  userId?: string
): Promise<void> {
  const docId = userId || deviceId;
  const userRef = firestore.collection(USERS_COLLECTION).doc(docId);

  await userRef.update({
    isPro,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Save session summary
 */
export async function saveSession(
  sessionId: string,
  params: {
    deviceId: string;
    userId?: string;
    primaryFocus: string;
    correctionCategory: string;
    improvementNote?: string;
    videoPath: string;
  }
): Promise<void> {
  const session: SessionSummary = {
    sessionId,
    deviceId: params.deviceId,
    userId: params.userId,
    date: Timestamp.now(),
    primaryFocus: params.primaryFocus,
    correctionCategory: params.correctionCategory,
    improvementNote: params.improvementNote,
    videoPath: params.videoPath,
  };

  await firestore.collection(SESSIONS_COLLECTION).doc(sessionId).set(session);
}

/**
 * Get user sessions
 */
export async function getUserSessions(
  deviceId: string,
  userId?: string,
  limit: number = 50
): Promise<SessionSummary[]> {
  const query = firestore
    .collection(SESSIONS_COLLECTION)
    .where("deviceId", "==", deviceId)
    .orderBy("date", "desc")
    .limit(limit);

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => doc.data() as SessionSummary);
}
