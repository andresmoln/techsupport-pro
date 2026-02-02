import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../../config/env.config";

/**
 * Rate limiter general: 100 peticiones por minuto por IP.
 */
export const generalRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Demasiadas peticiones. Por favor espera un momento antes de intentar de nuevo",
  },
});

/**
 * Rate limiter estricto para endpoints de autenticación.
 * Previene ataques de fuerza bruta: 10 intentos por minuto.
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Demasiados intentos de login. Por favor espera un minuto",
  },
});

/**
 * Timeout de peticiones.
 * Corta conexiones que excedan el límite configurado para liberar recursos.
 */
export const requestTimeout = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  res.setTimeout(config.requestTimeoutMs, () => {
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        message: "La petición expiró. Por favor intenta de nuevo",
      });
    }
  });

  next();
};

/**
 * Headers de seguridad HTTP.
 * Previene clickjacking, MIME sniffing y fuerza HTTPS en producción.
 */
export const securityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (config.nodeEnv === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Powered-By", "TechSupport-Pro");
  res.setHeader("X-API-Version", "1.0.0");

  next();
};

/**
 * Logger de peticiones HTTP con tiempo de respuesta.
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const startTime = Date.now();

  res.on("finish", () => {
    const responseTime = Date.now() - startTime;
    const logMessage = `${req.method} ${req.originalUrl} ${res.statusCode} - ${responseTime}ms`;

    if (config.nodeEnv === "development") {
      const color = res.statusCode >= 400 ? "\x1b[31m" : "\x1b[32m";
      console.log(`${color}${logMessage}\x1b[0m`);
    }
  });

  next();
};
