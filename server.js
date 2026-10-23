import express from "express";
import helmet from "helmet";
import cors from "cors";
import { normalizeAllowedOrigins } from "./src/config.ts";

const app = express();
const allowedOrigins = normalizeAllowedOrigins(process.env.ALLOWED_ORIGINS);

app.disable("x-powered-by");
app.disable("etag");

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

app.use(
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
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

app.use((req, _res, next) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  req.headers["x-request-id"] = requestId;
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

const requestTracker = new Map<string, { count: number; resetAt: number }>();
app.use((req, res, next) => {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const bucket = requestTracker.get(ip) ?? { count: 0, resetAt: now + 60000 };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + 60000;
  }

  bucket.count += 1;
  requestTracker.set(ip, bucket);

  if (bucket.count > 120) {
    return res.status(429).json({ ok: false, error: "RATE_LIMITED" });
  }

  res.setHeader("X-Request-Id", String(req.headers["x-request-id"] ?? ""));
  next();
});

app.get("/healthz", (_req, res) => {
  res.status(200).json({
    ok: true,
    environment: process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString(),
    turbo: true,
  });
});

app.get("/readyz", (_req, res) => {
  res.status(200).json({
    ok: true,
    ready: true,
    timestamp: new Date().toISOString(),
    turbo: true,
  });
});

app.use((err, _req, res, _next) => {
  const status = err?.statusCode ?? 500;
  const message = err instanceof Error ? err.message : "INTERNAL_SERVER_ERROR";
  res.status(status).json({ ok: false, error: message });
});

export default app;
