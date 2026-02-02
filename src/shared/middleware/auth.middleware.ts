import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../../config/env.config";
import {
  AuthRequest,
  JwtPayload,
  UnauthorizedError,
  ForbiddenError,
} from "../types";
import { Rol } from "@prisma/client";

/**
 * Verifica que el token JWT en el header Authorization sea válido
 * y decodifica el usuario en req.user para uso de los handlers.
 */
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Token de autenticación requerido");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }

    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError(
        "Token expirado. Por favor haz login de nuevo",
      );
    }

    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError("Token inválido");
    }

    throw new UnauthorizedError("Error de autenticación");
  }
};

/**
 * Verifica que el usuario tenga uno de los roles permitidos.
 *
 * Uso:
 *   router.get('/admin', authenticate, authorize(Rol.ADMIN), handler);
 */
export const authorize = (...allowedRoles: Rol[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError("Usuario no autenticado");
    }

    if (!allowedRoles.includes(req.user.rol as Rol)) {
      throw new ForbiddenError(
        `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(", ")}`,
      );
    }

    next();
  };
};

/**
 * Admin y Supervisor pueden acceder a todos los tickets.
 * Agentes solo ven tickets asignados a ellos (filtrado en el servicio).
 */
export const authorizeTicketAccess = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    throw new UnauthorizedError("Usuario no autenticado");
  }

  if (req.user.rol === Rol.ADMIN || req.user.rol === Rol.SUPERVISOR) {
    next();
    return;
  }

  next();
};
