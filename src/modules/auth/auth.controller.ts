import { Response } from "express";
import { AuthRequest } from "../../shared/types";
import { AuthService } from "./auth.service";
import { logInfo } from "../../config/logger.config";

const authService = new AuthService();

/**
 * Controlador de autenticación.
 * Maneja las peticiones HTTP y delega la lógica al servicio.
 */
export class AuthController {
  /**
   * POST /api/auth/register
   * Registrar un nuevo usuario (solo ADMIN).
   */
  async register(req: AuthRequest, res: Response): Promise<void> {
    const user = await authService.register(req.body);

    logInfo("Usuario registrado", { userId: user.id, email: user.email });

    res.status(201).json({
      success: true,
      message: "Usuario creado exitosamente",
      data: user,
    });
  }

  /**
   * POST /api/auth/login
   * Iniciar sesión y obtener tokens.
   */
  async login(req: AuthRequest, res: Response): Promise<void> {
    const tokens = await authService.login(req.body);

    logInfo("Usuario inició sesión", { email: req.body.email });

    res.json({
      success: true,
      message: "Login exitoso",
      data: tokens,
    });
  }

  /**
   * POST /api/auth/refresh
   * Obtener un nuevo access token usando el refresh token.
   */
  async refreshToken(req: AuthRequest, res: Response): Promise<void> {
    const tokens = await authService.refreshToken(req.body);

    res.json({
      success: true,
      message: "Token renovado",
      data: tokens,
    });
  }

  /**
   * POST /api/auth/logout
   * Cerrar sesión e invalidar el refresh token.
   */
  async logout(req: AuthRequest, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    await authService.logout(refreshToken);

    logInfo("Usuario cerró sesión", { userId: req.user?.userId });

    res.json({
      success: true,
      message: "Logout exitoso",
    });
  }

  /**
   * GET /api/auth/me
   * Obtener información del usuario autenticado.
   */
  async getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "No autenticado",
      });
      return;
    }

    const user = await authService.getUserById(req.user.userId);

    res.json({
      success: true,
      data: user,
    });
  }
}
