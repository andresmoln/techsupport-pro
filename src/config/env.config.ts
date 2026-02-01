import dotenv from "dotenv";

// Carga las variables de entorno desde el archivo .env
dotenv.config();

/**
 * Configuración centralizada de la aplicación.
 * Todas las variables de entorno se leen, validan y tipan aquí.
 */
interface Config {
  // servidor
  nodeEnv: string;
  port: number;

  // bases de datos
  databaseUrl: string;
  mongodbUri: string;

  // redis
  redisHost: string;
  redisPort: number;

  // jwt
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;

  // rate limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;

  // timeouts
  requestTimeoutMs: number;

  // sla
  slaVipHours: number;
  slaNormalHours: number;

  // archivos
  maxFileSizeMB: number;
  uploadDir: string;

  // bull queue
  queueConcurrency: number;
}

/**
 * Helper para obtener variables de entorno.
 * Lanza un error si la variable es requerida y no está definida.
 */
const getEnvVar = (key: string, required: boolean = true): string => {
  const value = process.env[key];

  if (required && !value) {
    throw new Error(
      `Variable de entorno ${key} es requerida pero no está definida`,
    );
  }

  return value || "";
};

/**
 * Objeto de configuración exportado y tipado.
 */
export const config: Config = {
  // servidor
  nodeEnv: getEnvVar("NODE_ENV", false) || "development",
  port: parseInt(getEnvVar("PORT", false) || "3000", 10),

  // bases de datos
  databaseUrl: getEnvVar("DATABASE_URL"),
  mongodbUri: getEnvVar("MONGODB_URI"),

  // redis
  redisHost: getEnvVar("REDIS_HOST", false) || "localhost",
  redisPort: parseInt(getEnvVar("REDIS_PORT", false) || "6379", 10),

  // jwt
  jwtSecret: getEnvVar("JWT_SECRET"),
  jwtRefreshSecret: getEnvVar("JWT_REFRESH_SECRET"),
  jwtExpiresIn: getEnvVar("JWT_EXPIRES_IN", false) || "15m",
  jwtRefreshExpiresIn: getEnvVar("JWT_REFRESH_EXPIRES_IN", false) || "7d",

  // rate limiting
  rateLimitWindowMs: parseInt(
    getEnvVar("RATE_LIMIT_WINDOW_MS", false) || "60000",
    10,
  ),
  rateLimitMaxRequests: parseInt(
    getEnvVar("RATE_LIMIT_MAX_REQUESTS", false) || "100",
    10,
  ),

  // timeouts
  requestTimeoutMs: parseInt(
    getEnvVar("REQUEST_TIMEOUT_MS", false) || "30000",
    10,
  ),

  // sla
  slaVipHours: parseInt(getEnvVar("SLA_VIP_HOURS", false) || "2", 10),
  slaNormalHours: parseInt(getEnvVar("SLA_NORMAL_HOURS", false) || "24", 10),

  // archivos
  maxFileSizeMB: parseInt(getEnvVar("MAX_FILE_SIZE_MB", false) || "20", 10),
  uploadDir: getEnvVar("UPLOAD_DIR", false) || "./uploads",

  // bull queue
  queueConcurrency: parseInt(getEnvVar("QUEUE_CONCURRENCY", false) || "10", 10),
};

/**
 * Valida la configuración al iniciar la aplicación.
 * Se ejecuta una sola vez al arranque.
 */
export const validateConfig = (): void => {
  console.log("Validando configuración...");

  // validaciones de seguridad específicas para producción
  if (config.nodeEnv === "production") {
    if (config.jwtSecret.length < 32) {
      throw new Error(
        "JWT_SECRET debe tener al menos 32 caracteres en producción",
      );
    }

    if (config.jwtRefreshSecret.length < 32) {
      throw new Error(
        "JWT_REFRESH_SECRET debe tener al menos 32 caracteres en producción",
      );
    }
  }

  // validación de puertos
  if (config.port < 1 || config.port > 65535) {
    throw new Error("PORT debe estar entre 1 y 65535");
  }

  if (config.redisPort < 1 || config.redisPort > 65535) {
    throw new Error("REDIS_PORT debe estar entre 1 y 65535");
  }

  console.log("Configuración válida");
  console.log(`Entorno: ${config.nodeEnv}`);
  console.log(`Puerto: ${config.port}`);
  console.log(
    `SLA VIP: ${config.slaVipHours}h | Normal: ${config.slaNormalHours}h`,
  );
};
