import { Response } from "express";
import { AuthRequest } from "../../shared/types";
import { AuthService } from "./auth.service";
import { logInfo } from "../../config/logger.config";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * POST /api/auth/register
   * Registrar un nuevo usuario (solo ADMIN).
   */
  register = async (req: AuthRequest, res: Response): Promise<void> => {
    const user = await this.authService.register(req.body);

    logInfo("Usuario registrado", {
      userId: user.id,
      email: user.email,
    });

    res.status(201).json({
      success: true,
      message: "Usuario creado exitosamente",
      data: user,
    });
  };

  /**
   * POST /api/auth/login
   * Iniciar sesión y obtener tokens.
   */
  login = async (req: AuthRequest, res: Response): Promise<void> => {
    const tokens = await this.authService.login(req.body);

    logInfo("Usuario inició sesión", { email: req.body.email });

    res.json({
      success: true,
      message: "Login exitoso",
      data: tokens,
    });
  };

  /**
   * POST /api/auth/refresh
   * Obtener un nuevo access token usando el refresh token.
   */
  refreshToken = async (req: AuthRequest, res: Response): Promise<void> => {
    const tokens = await this.authService.refreshToken(req.body);

    res.json({
      success: true,
      message: "Token renovado",
      data: tokens,
    });
  };

  /**
   * POST /api/auth/logout
   * Cerrar sesión e invalidar el refresh token.
   */
  logout = async (req: AuthRequest, res: Response): Promise<void> => {
    const { refreshToken } = req.body;

    await this.authService.logout(refreshToken);

    logInfo("Usuario cerró sesión", {
      userId: req.user?.userId,
    });

    res.json({
      success: true,
      message: "Logout exitoso",
    });
  };

  /**
   * GET /api/auth/me
   * Obtener información del usuario autenticado.
   */
  getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "No autenticado",
      });
      return;
    }

    const user = await this.authService.getUserById(req.user.userId);

    res.json({
      success: true,
      data: user,
    });
  };
}
