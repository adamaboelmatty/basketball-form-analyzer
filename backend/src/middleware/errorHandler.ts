import { Request, Response, NextFunction } from "express";

export interface ApiError extends Error {
  code?: string;
  statusCode?: number;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";
  const message = err.message || "An unexpected error occurred";

  // Log error for debugging
  console.error("API Error:", {
    code,
    message,
    statusCode,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    code,
    message,
  });
}

export function createError(
  message: string,
  code: string,
  statusCode: number = 500
): ApiError {
  const error: ApiError = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}
