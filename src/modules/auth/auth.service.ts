import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
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

export class AuthService {
  async register(data: RegisterDto): Promise<UserResponse> {
    const existingUser = await prisma.usuario.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError("El email ya está registrado");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.usuario.create({
      data: {
        email: data.email,
        password: hashedPassword,
        nombre: data.nombre,
        rol: data.rol ?? Rol.AGENTE,
      },
    });

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

  async login(data: LoginDto): Promise<AuthTokens> {
    const user = await prisma.usuario.findUnique({
      where: { email: data.email },
    });

    if (!user || !user.activo) {
      throw new UnauthorizedError("Credenciales inválidas");
    }

    const validPassword = await bcrypt.compare(data.password, user.password);

    if (!validPassword) {
      throw new UnauthorizedError("Credenciales inválidas");
    }

    return this.generateTokens(user.id, user.email, user.rol);
  }

  async refreshToken(data: RefreshTokenDto): Promise<AuthTokens> {
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token: data.refreshToken },
      include: { usuario: true },
    });

    if (
      !refreshToken ||
      !refreshToken.usuario.activo ||
      new Date() > refreshToken.expiresAt
    ) {
      throw new UnauthorizedError("Refresh token inválido");
    }

    await prisma.refreshToken.delete({
      where: { id: refreshToken.id },
    });

    return this.generateTokens(
      refreshToken.usuario.id,
      refreshToken.usuario.email,
      refreshToken.usuario.rol,
    );
  }

  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  async getUserById(userId: string): Promise<UserResponse> {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("Usuario no encontrado");
    }

    return this.mapUserToResponse(user);
  }

  private async generateTokens(
    userId: string,
    email: string,
    rol: Rol,
  ): Promise<AuthTokens> {
    const payload = { userId, email, rol };

    const accessToken = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    } satisfies SignOptions);

    const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiresIn,
    } satisfies SignOptions);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

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
      expiresIn: String(config.jwtExpiresIn),
    };
  }

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
