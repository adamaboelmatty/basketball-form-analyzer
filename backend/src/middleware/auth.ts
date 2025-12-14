import { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  deviceId?: string;
  isAnonymous?: boolean;
}

/**
 * Authentication middleware
 * Extracts user ID from Firebase token or device ID from headers
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;

    // Get device ID from header (always present)
    const deviceId = req.headers["x-device-id"] as string;

    if (!deviceId) {
      res.status(401).json({
        code: "UNAUTHORIZED",
        message: "Device ID required",
      });
      return;
    }

    authReq.deviceId = deviceId;
    authReq.isAnonymous = true;

    // TODO: Add Firebase Auth token validation
    // const authHeader = req.headers.authorization;
    // if (authHeader?.startsWith("Bearer ")) {
    //   const token = authHeader.substring(7);
    //   const decodedToken = await admin.auth().verifyIdToken(token);
    //   authReq.userId = decodedToken.uid;
    //   authReq.isAnonymous = false;
    // }

    next();
  } catch (error) {
    res.status(401).json({
      code: "UNAUTHORIZED",
      message: "Authentication failed",
    });
  }
}
