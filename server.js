import express from "express";
import helmet from "helmet";
import cors from "cors";
import app from "./dist/server.js";

const runtimeApp = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

runtimeApp.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

runtimeApp.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS_NOT_ALLOWED"));
    },
    credentials: true,
  }),
);

runtimeApp.use(express.json({ limit: "1mb" }));
runtimeApp.use(express.urlencoded({ extended: true, limit: "1mb" }));

runtimeApp.get("/healthz", (_req, res) => {
  res.status(200).json({
    ok: true,
    environment: process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString(),
  });
});

runtimeApp.get("/readyz", (_req, res) => {
  res.status(200).json({
    ok: true,
    ready: true,
    timestamp: new Date().toISOString(),
  });
});

runtimeApp.use((err, _req, res, _next) => {
  const message = err instanceof Error ? err.message : "INTERNAL_SERVER_ERROR";
  res.status(500).json({
    ok: false,
    error: message,
  });
});

runtimeApp.use(app);

export default runtimeApp;
