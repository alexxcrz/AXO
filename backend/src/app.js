import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  chatRateLimitMaxRequests,
  authRateLimitMaxRequests,
  corsOriginValidator,
  isProduction,
  jsonBodyLimit,
  maxRequestsPerWindow,
  trustProxyValue,
  uploadRateLimitMaxRequests,
  urlencodedBodyLimit,
  windowMs,
} from "./config/env.js";
import { attachAuthSession, requireAuth, requireTrustedOrigin } from "./middleware/auth.middleware.js";
import { authRouter } from "./routes/auth.routes.js";
import { boardRouter } from "./routes/board.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { healthRouter } from "./routes/health.routes.js";
import { importRouter } from "./routes/import.routes.js";
import { uploadRouter } from "./routes/upload.routes.js";
import { bibliotecaRouter } from "./routes/biblioteca.routes.js";
import { warehouseRouter } from "./routes/warehouse.routes.js";
import { chatRouter } from "./routes/chat.routes.js";
import { copmecAiRouter } from "./routes/copmecai.routes.js";
import { auditSecurityEvent } from "./services/security-events.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, "../frontend-dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");
const hasFrontendBuild = fs.existsSync(frontendIndexPath);

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", trustProxyValue);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      // Keep inline styles for Vite and allow Google Translate injected stylesheet.
      styleSrc: ["'self'", "'unsafe-inline'", "https://www.gstatic.com", "https://fonts.googleapis.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://www.gstatic.com", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://*.onrender.com", "https://cdn.jsdelivr.net"],
      mediaSrc: ["'self'", "blob:", "data:", "https://*.onrender.com"],
      connectSrc: ["'self'", "ws:", "wss:", "blob:", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'self'", "blob:"],
      frameSrc: ["'self'", "blob:"],
      workerSrc: ["'self'", "blob:"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  crossOriginEmbedderPolicy: false, // keep false: Cloudinary images would break with require-corp
  hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  permissionsPolicy: {
    features: {
      camera: ["'self'"],
      microphone: ["'self'"],
      geolocation: [],
      payment: [],
      usb: [],
      bluetooth: [],
      accelerometer: [],
      gyroscope: [],
      magnetometer: [],
    },
  },
}));

app.use(cors({
  origin: corsOriginValidator,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,
}));

app.use(rateLimit({
  windowMs,
  max: maxRequestsPerWindow,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.path === "/api/health" ||
    req.path.startsWith("/api/chat") ||
    req.path.startsWith("/api/auth"),
  handler: (req, res) => {
    auditSecurityEvent("rate_limited", req, { scope: "global" });
    res.status(429).json({ message: "Demasiadas solicitudes. Intenta de nuevo en unos minutos." });
  },
}));

const uploadLimiter = rateLimit({
  windowMs,
  max: uploadRateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    auditSecurityEvent("rate_limited", req, { scope: "uploads" });
    res.status(429).json({ message: "Límite temporal alcanzado para cargas o importaciones." });
  },
});

const authLimiter = rateLimit({
  windowMs,
  max: authRateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "GET",
  handler: (req, res) => {
    auditSecurityEvent("rate_limited", req, { scope: "auth_login" });
    res.status(429).json({ message: "Demasiados intentos de autenticación. Intenta más tarde." });
  },
});

const chatReadLimiter = rateLimit({
  windowMs,
  max: chatRateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== "GET",
  handler: (req, res) => {
    auditSecurityEvent("rate_limited", req, { scope: "chat_read" });
    res.status(429).json({ message: "Chat temporalmente limitado por alta actividad. Reintentando..." });
  },
});

const chatWriteLimiter = rateLimit({
  windowMs,
  max: Math.max(400, Math.floor(chatRateLimitMaxRequests / 4)),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "GET" || req.path === "/calls/signal" || req.path === "/calls/pending",
  handler: (req, res) => {
    auditSecurityEvent("rate_limited", req, { scope: "chat_write" });
    res.status(429).json({ message: "Chat temporalmente limitado por alta actividad. Reintentando..." });
  },
});

app.use(cookieParser());
app.use(attachAuthSession);
app.use(requireTrustedOrigin);
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  next();
});
app.use(express.json({ limit: jsonBodyLimit, strict: true }));
app.use(express.urlencoded({ extended: true, limit: urlencodedBodyLimit }));

app.get("/api", (_req, res) => {
  res.json({
    name: "COPMEC API",
    status: "ok",
    environment: isProduction ? "production" : "development",
  });
});

app.use("/api/health", healthRouter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/password", authLimiter);
app.use("/api/auth", authRouter);
app.use("/api/boards", requireAuth, boardRouter);
app.use("/api/imports", requireAuth, uploadLimiter, importRouter);
app.use("/api/uploads", requireAuth, uploadLimiter, uploadRouter);
app.use("/api/biblioteca", requireAuth, bibliotecaRouter);
app.use("/api/warehouse", requireAuth, warehouseRouter);

// DEBUG: dev-only endpoint to insert a process audit template without auth
app.use("/api/chat", requireAuth, chatReadLimiter, chatWriteLimiter, chatRouter);
app.use("/api/copmec-ai", requireAuth, copmecAiRouter);

if (hasFrontendBuild) {
  app.use(express.static(frontendDistPath));
  app.get("/{*path}", (req, res, next) => {
    if (req.path === "/api" || req.path.startsWith("/api/")) {
      return next();
    }

    res.sendFile(frontendIndexPath);
  });
} else {
  app.get("/", (_req, res) => {
    res.json({
      name: "COPMEC API",
      status: "ok",
      environment: isProduction ? "production" : "development",
      frontend: "build not found",
    });
  });
}

app.use(errorHandler);
