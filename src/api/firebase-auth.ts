// Firebase Auth Service
// This service handles authentication with Firebase
// Supports Email/Password and Apple Sign-In

import * as Crypto from "expo-crypto";

// Firebase config - should be set in environment variables
const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "";
const FIREBASE_AUTH_DOMAIN = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "";

// Firebase Auth REST API endpoints
const FIREBASE_AUTH_BASE = "https://identitytoolkit.googleapis.com/v1";
const FIREBASE_SIGN_UP = `${FIREBASE_AUTH_BASE}/accounts:signUp?key=${FIREBASE_API_KEY}`;
const FIREBASE_SIGN_IN = `${FIREBASE_AUTH_BASE}/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
const FIREBASE_SIGN_IN_WITH_IDP = `${FIREBASE_AUTH_BASE}/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`;
const FIREBASE_GET_USER = `${FIREBASE_AUTH_BASE}/accounts:lookup?key=${FIREBASE_API_KEY}`;
const FIREBASE_REFRESH_TOKEN = `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`;

export interface FirebaseUser {
  uid: string;
  email: string;
  displayName?: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthError {
  code: string;
  message: string;
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<FirebaseUser> {
  const response = await fetch(FIREBASE_SIGN_UP, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw createAuthError(data.error);
  }

  return {
    uid: data.localId,
    email: data.email,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresIn: parseInt(data.expiresIn, 10),
  };
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<FirebaseUser> {
  const response = await fetch(FIREBASE_SIGN_IN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw createAuthError(data.error);
  }

  return {
    uid: data.localId,
    email: data.email,
    displayName: data.displayName,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresIn: parseInt(data.expiresIn, 10),
  };
}

/**
 * Sign in with Apple ID Token
 * The Apple Sign-In UI should be handled by the component using expo-auth-session
 * This function exchanges the Apple identity token for a Firebase token
 */
export async function signInWithAppleToken(
  identityToken: string,
  nonce: string,
  fullName?: { givenName?: string | null; familyName?: string | null }
): Promise<FirebaseUser> {
  // Exchange Apple credential for Firebase token
  const response = await fetch(FIREBASE_SIGN_IN_WITH_IDP, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      postBody: `id_token=${identityToken}&providerId=apple.com&nonce=${nonce}`,
      requestUri: `https://${FIREBASE_AUTH_DOMAIN}/__/auth/handler`,
      returnIdpCredential: true,
      returnSecureToken: true,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw createAuthError(data.error);
  }

  // Build display name from Apple credential if available
  let displayName = data.displayName;
  if (!displayName && fullName) {
    const { givenName, familyName } = fullName;
    if (givenName || familyName) {
      displayName = [givenName, familyName].filter(Boolean).join(" ");
    }
  }

  return {
    uid: data.localId,
    email: data.email || "",
    displayName,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    expiresIn: parseInt(data.expiresIn, 10),
  };
}

/**
 * Refresh the ID token
 */
export async function refreshIdToken(refreshToken: string): Promise<{
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const response = await fetch(FIREBASE_REFRESH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw createAuthError(data.error);
  }

  return {
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresIn: parseInt(data.expires_in, 10),
  };
}

/**
 * Get user data from token
 */
export async function getUserData(idToken: string): Promise<{
  uid: string;
  email: string;
  displayName?: string;
}> {
  const response = await fetch(FIREBASE_GET_USER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw createAuthError(data.error);
  }

  const user = data.users?.[0];
  if (!user) {
    throw new Error("User not found");
  }

  return {
    uid: user.localId,
    email: user.email,
    displayName: user.displayName,
  };
}

/**
 * Generate a random nonce for Apple Sign In
 */
export async function generateNonce(length = 32): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(length);
  return Array.from(randomBytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hash a nonce for Apple Sign In
 */
export async function hashNonce(nonce: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
}

/**
 * Create a user-friendly auth error
 */
function createAuthError(error: { code?: string; message?: string }): AuthError {
  const errorMessages: Record<string, string> = {
    EMAIL_EXISTS: "An account with this email already exists.",
    EMAIL_NOT_FOUND: "No account found with this email.",
    INVALID_PASSWORD: "Incorrect password. Please try again.",
    INVALID_EMAIL: "Please enter a valid email address.",
    WEAK_PASSWORD: "Password should be at least 6 characters.",
    USER_DISABLED: "This account has been disabled.",
    TOO_MANY_ATTEMPTS_TRY_LATER: "Too many attempts. Please try again later.",
    INVALID_LOGIN_CREDENTIALS: "Invalid email or password.",
  };

  const code = error.code || error.message?.split(" ")[0] || "UNKNOWN_ERROR";
  const message = errorMessages[code] || error.message || "Authentication failed. Please try again.";

  return { code, message };
}

/**
 * Get a friendly error message for display
 */
export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Check if it's an Apple Sign In cancellation
    if (error.message.includes("canceled") || error.message.includes("cancelled")) {
      return "Sign in was cancelled.";
    }
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return (error as AuthError).message;
  }

  return "Authentication failed. Please try again.";
}
