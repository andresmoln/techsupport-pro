import { Router } from "express";
import { AuthController } from "./auth.controller";
import { asyncHandler } from "../../shared/middleware/errorHandler";
import {
  authenticate,
  authorize,
} from "../../shared/middleware/auth.middleware";
import {
  validateLogin,
  validateRegister,
} from "../../shared/middleware/validation.middleware";
import { authRateLimiter } from "../../shared/middleware/security.middleware";
import { Rol } from "@prisma/client";

const router = Router();
const authController = new AuthController();

/**
 * POST /api/auth/register
 * Registrar un nuevo usuario (solo ADMIN).
 */
router.post(
  "/register",
  authenticate,
  authorize(Rol.ADMIN),
  validateRegister,
  asyncHandler(authController.register.bind(authController)),
);

/**
 * POST /api/auth/login
 * Iniciar sesión.
 */
router.post(
  "/login",
  authRateLimiter,
  validateLogin,
  asyncHandler(authController.login.bind(authController)),
);

/**
 * POST /api/auth/refresh
 * Renovar access token.
 */
router.post(
  "/refresh",
  asyncHandler(authController.refreshToken.bind(authController)),
);

/**
 * POST /api/auth/logout
 * Cerrar sesión.
 */
router.post(
  "/logout",
  authenticate,
  asyncHandler(authController.logout.bind(authController)),
);

/**
 * GET /api/auth/me
 * Obtener información del usuario autenticado.
 */
router.get(
  "/me",
  authenticate,
  asyncHandler(authController.getCurrentUser.bind(authController)),
);

export { router as authRoutes };
