import winston from "winston";
import { config } from "./env.config";

/**
 * Sistema centralizado de logging usando Winston.
 * Maneja logs estructurados, rotación de archivos y niveles por entorno.
 */

/**
 * Formato base de logs (JSON).
 * Usado para archivos y sistemas externos de logging.
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

/**
 * Formato legible para consola (solo desarrollo).
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }

    return msg;
  }),
);

/**
 * Instancia principal del logger.
 */
export const logger = winston.createLogger({
  level: config.nodeEnv === "development" ? "debug" : "info",
  format: logFormat,
  defaultMeta: {
    service: "techsupport-pro",
    environment: config.nodeEnv,
  },
  transports: [
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
  exitOnError: false,
});

/**
 * Habilitar logs por consola solo en entornos no productivos.
 */
if (config.nodeEnv !== "production") {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    }),
  );
}

/**
 * Log de peticiones HTTP.
 */
export const logRequest = (
  method: string,
  url: string,
  statusCode: number,
  responseTime: number,
): void => {
  logger.http(`${method} ${url} ${statusCode} - ${responseTime}ms`);
};

/**
 * Log de errores con contexto adicional.
 */
export const logError = (
  error: Error,
  context?: Record<string, unknown>,
): void => {
  logger.error(error.message, {
    stack: error.stack,
    ...context,
  });
};

/**
 * Log de información de negocio.
 */
export const logInfo = (
  message: string,
  metadata?: Record<string, unknown>,
): void => {
  logger.info(message, metadata);
};

/**
 * Log de advertencias.
 */
export const logWarning = (
  message: string,
  metadata?: Record<string, unknown>,
): void => {
  logger.warn(message, metadata);
};

/**
 * Log para debugging (principalmente en desarrollo).
 */
export const logDebug = (
  message: string,
  metadata?: Record<string, unknown>,
): void => {
  logger.debug(message, metadata);
};
