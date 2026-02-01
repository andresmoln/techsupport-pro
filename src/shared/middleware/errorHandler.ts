import { Request, Response, NextFunction } from "express";
import { AppError } from "../types";
import { logger } from "../../config/logger.config";
import { config } from "../../config/env.config";

// Este middleware debe ser siempre el último en la cadena de Express.
// Express lo identifica como error handler por tener exactamente 4 parámetros.
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  // next es requerido para que Express reconozca esta función como error handler,
  // aunque no lo usemos explícitamente
  next: NextFunction, // eslint-disable-line @typescript-eslint/no-unused-vars
): void => {
  if (error instanceof AppError) {
    logger.error(`[AppError] ${error.message}`, {
      statusCode: error.statusCode,
      url: req.originalUrl,
      method: req.method,
    });

    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    logger.error("[SyntaxError] JSON inválido", {
      url: req.originalUrl,
      method: req.method,
    });

    res.status(400).json({
      success: false,
      message: "JSON inválido en el cuerpo de la petición",
    });
    return;
  }

  if (error.name === "PrismaClientKnownRequestError") {
    const prismaError = error as { code?: string };

    // P2002: unique constraint violation
    if (prismaError.code === "P2002") {
      logger.warn("[Prisma] Conflicto de dato único", {
        url: req.originalUrl,
        method: req.method,
      });

      res.status(409).json({
        success: false,
        message: "El recurso ya existe (dato único duplicado)",
      });
      return;
    }

    // P2025: record not found
    if (prismaError.code === "P2025") {
      res.status(404).json({
        success: false,
        message: "Recurso no encontrado",
      });
      return;
    }
  }

  // En producción no exponemos el mensaje real del error por seguridad
  logger.error("[UnhandledError] Error no manejado", {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    message:
      config.nodeEnv === "production"
        ? "Error interno del servidor"
        : error.message,
  });
};

/**
 * Wrapper para handlers async.
 * Express no captura errores de funciones async automáticamente,
 * así que este wrapper los captura y los envía al errorHandler.
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
};
