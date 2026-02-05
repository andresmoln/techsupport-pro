import dotenv from "dotenv";
import type { SignOptions } from "jsonwebtoken";

dotenv.config();

type JwtExpiresIn = SignOptions["expiresIn"];

interface Config {
  nodeEnv: string;
  port: number;

  databaseUrl: string;
  mongodbUri: string;

  redisHost: string;
  redisPort: number;

  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: JwtExpiresIn;
  jwtRefreshExpiresIn: JwtExpiresIn;

  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;

  requestTimeoutMs: number;

  slaVipHours: number;
  slaNormalHours: number;

  maxFileSizeMB: number;
  uploadDir: string;

  queueConcurrency: number;
}

const getEnvVar = (key: string, required = true): string => {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Variable de entorno ${key} es requerida`);
  }
  return value ?? "";
};

export const config: Config = {
  nodeEnv: getEnvVar("NODE_ENV", false) || "development",
  port: Number(getEnvVar("PORT", false) || 3000),

  databaseUrl: getEnvVar("DATABASE_URL"),
  mongodbUri: getEnvVar("MONGODB_URI"),

  redisHost: getEnvVar("REDIS_HOST", false) || "localhost",
  redisPort: Number(getEnvVar("REDIS_PORT", false) || 6379),

  jwtSecret: getEnvVar("JWT_SECRET"),
  jwtRefreshSecret: getEnvVar("JWT_REFRESH_SECRET"),

  // 👇 CAST CORRECTO Y CONTROLADO
  jwtExpiresIn: (getEnvVar("JWT_EXPIRES_IN", false) ||
    "15m") as JwtExpiresIn,

  jwtRefreshExpiresIn: (getEnvVar("JWT_REFRESH_EXPIRES_IN", false) ||
    "7d") as JwtExpiresIn,

  rateLimitWindowMs: Number(
    getEnvVar("RATE_LIMIT_WINDOW_MS", false) || 60000,
  ),
  rateLimitMaxRequests: Number(
    getEnvVar("RATE_LIMIT_MAX_REQUESTS", false) || 100,
  ),

  requestTimeoutMs: Number(
    getEnvVar("REQUEST_TIMEOUT_MS", false) || 30000,
  ),

  slaVipHours: Number(getEnvVar("SLA_VIP_HOURS", false) || 2),
  slaNormalHours: Number(
    getEnvVar("SLA_NORMAL_HOURS", false) || 24,
  ),

  maxFileSizeMB: Number(getEnvVar("MAX_FILE_SIZE_MB", false) || 20),
  uploadDir: getEnvVar("UPLOAD_DIR", false) || "./uploads",

  queueConcurrency: Number(
    getEnvVar("QUEUE_CONCURRENCY", false) || 10,
  ),
};

export const validateConfig = (): void => {
  if (config.nodeEnv === "production") {
    if (config.jwtSecret.length < 32) {
      throw new Error("JWT_SECRET debe tener al menos 32 caracteres");
    }
    if (config.jwtRefreshSecret.length < 32) {
      throw new Error(
        "JWT_REFRESH_SECRET debe tener al menos 32 caracteres",
      );
    }
  }
};
