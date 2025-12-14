import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import routes
import analysisRouter from "./routes/analysis";
import sessionsRouter from "./routes/sessions";
import entitlementsRouter from "./routes/entitlements";
import purchasesRouter from "./routes/purchases";
import internalRouter from "./routes/internal";
import webhooksRouter from "./routes/webhooks";

// Import middleware
import { errorHandler } from "./middleware/errorHandler";
import { authMiddleware } from "./middleware/auth";

const app: Express = express();
const PORT = process.env.PORT || 8080;

// Security & Performance Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: true, // Allow all origins for mobile app
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging in development
if (process.env.NODE_ENV === "development") {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint (no auth required)
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// API Routes (with auth middleware)
app.use("/v1/analysis", authMiddleware, analysisRouter);
app.use("/v1/sessions", authMiddleware, sessionsRouter);
app.use("/v1/entitlements", authMiddleware, entitlementsRouter);
app.use("/v1/purchases", authMiddleware, purchasesRouter);

// Webhook routes (no auth - verified by webhook signature or IP)
app.use("/webhooks", webhooksRouter);

// Internal routes (no auth - called by Cloud Tasks)
app.use("/internal", internalRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    code: "NOT_FOUND",
    message: "Endpoint not found",
  });
});

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ARC Backend API running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌍 GCP Project: ${process.env.GCP_PROJECT_ID}`);
});

export default app;
