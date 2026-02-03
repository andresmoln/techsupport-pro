import bcrypt from "bcrypt";
import jwt, { Secret } from "jsonwebtoken";
import { prisma } from "../../config/database.config";
import { config } from "../../config/env.config";
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  AuthTokens,
  UserResponse,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from "../../shared/types";
import { Rol } from "@prisma/client";

/**
 * Servicio de autenticación.
 * Maneja login, registro, generación de tokens y refresh.
 */
export class AuthService {
  /**
   * Registrar un nuevo usuario.
   * Solo ADMIN puede crear usuarios.
   */
  async register(data: RegisterDto): Promise<UserResponse> {
    // Verificar que el email no esté en uso
    const existingUser = await prisma.usuario.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError("El email ya está registrado");
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Crear el usuario
    const user = await prisma.usuario.create({
      data: {
        email: data.email,
        password: hashedPassword,
        nombre: data.nombre,
        rol: data.rol || Rol.AGENTE,
      },
    });

    // Si el rol es AGENTE, crear el registro de Agente
    if (user.rol === Rol.AGENTE) {
      await prisma.agente.create({
        data: {
          nombre: user.nombre,
          email: user.email,
          usuarioId: user.id,
        },
      });
    }

    return this.mapUserToResponse(user);
  }

  /**
   * Login de usuario.
   * Retorna access token y refresh token.
   */
  async login(data: LoginDto): Promise<AuthTokens> {
    // Buscar usuario por email
    const user = await prisma.usuario.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedError("Credenciales inválidas");
    }

    // Verificar que el usuario esté activo
    if (!user.activo) {
      throw new UnauthorizedError("Usuario inactivo");
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError("Credenciales inválidas");
    }

    // Generar tokens
    return this.generateTokens(user.id, user.email, user.rol);
  }

  /**
   * Refresh token.
   * Genera un nuevo access token usando un refresh token válido.
   */
  async refreshToken(data: RefreshTokenDto): Promise<AuthTokens> {
    // Buscar el refresh token en la base de datos
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token: data.refreshToken },
      include: { usuario: true },
    });

    if (!refreshToken) {
      throw new UnauthorizedError("Refresh token inválido");
    }

    // Verificar que no haya expirado
    if (new Date() > refreshToken.expiresAt) {
      await prisma.refreshToken.delete({
        where: { id: refreshToken.id },
      });
      throw new UnauthorizedError("Refresh token expirado");
    }

    // Verificar que el usuario esté activo
    if (!refreshToken.usuario.activo) {
      throw new UnauthorizedError("Usuario inactivo");
    }

    // Eliminar el refresh token usado (one-time use)
    await prisma.refreshToken.delete({
      where: { id: refreshToken.id },
    });

    // Generar nuevos tokens
    return this.generateTokens(
      refreshToken.usuario.id,
      refreshToken.usuario.email,
      refreshToken.usuario.rol,
    );
  }

  /**
   * Logout.
   * Invalida el refresh token.
   */
  async logout(refreshToken: string): Promise<void> {
    const token = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (token) {
      await prisma.refreshToken.delete({
        where: { id: token.id },
      });
    }
  }

  /**
   * Obtener usuario por ID.
   */
  async getUserById(userId: string): Promise<UserResponse> {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("Usuario no encontrado");
    }

    return this.mapUserToResponse(user);
  }

  /**
   * Generar access token y refresh token.
   */
  private async generateTokens(
    userId: string,
    email: string,
    rol: Rol,
  ): Promise<AuthTokens> {
    // Payload del JWT
    const payload = {
      userId,
      email,
      rol,
    };

    // Access token (corta vida)
    const accessToken = jwt.sign(payload, config.jwtSecret as Secret, {
      expiresIn: config.jwtExpiresIn,
    });

    // Refresh token (larga vida)
    const refreshToken = jwt.sign(payload, config.jwtRefreshSecret as Secret, {
      expiresIn: config.jwtRefreshExpiresIn,
    });

    // Guardar refresh token en la base de datos
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 días

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        usuarioId: userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwtExpiresIn,
    };
  }

  /**
   * Mapear entidad Usuario a respuesta sin datos sensibles.
   */
  private mapUserToResponse(user: {
    id: string;
    email: string;
    nombre: string;
    rol: Rol;
    activo: boolean;
    createdAt: Date;
  }): UserResponse {
    return {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      activo: user.activo,
      createdAt: user.createdAt,
    };
  }
}
