import { Request } from "express";
import { Rol } from "@prisma/client";

// ============================================================
// REQUEST TYPES
// ============================================================

export interface JwtPayload {
  userId: string;
  email: string;
  rol: Rol;
  iat?: number;
  exp?: number;
}

/**
 * Extensión de Express.Request con el usuario autenticado.
 * El middleware de auth decodifica el token y asigna el payload a req.user.
 */
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// ============================================================
// RESPONSE TYPES
// ============================================================

/**
 * Estructura estándar para todas las respuestas de la API.
 * Permite que los clientes procesen respuestas de forma predecible.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// ============================================================
// QUERY PARAMS TYPES
// ============================================================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface TicketFilters {
  estado?: string;
  prioridad?: string;
  clienteId?: string;
  agenteAsignadoId?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
}

// ============================================================
// DTOs (Data Transfer Objects)
// ============================================================

/**
 * La prioridad y nivel de escalamiento se calculan automáticamente
 * según el tipo de cliente, no los envía el cliente.
 */
export interface CreateTicketDto {
  titulo: string;
  descripcion: string;
  clienteId: string;
  agenteAsignadoId?: string;
}

export interface UpdateTicketDto {
  titulo?: string;
  descripcion?: string;
  estado?: string;
  agenteAsignadoId?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

/**
 * Solo un ADMIN puede crear usuarios.
 * Si no se proporciona rol, se asigna AGENTE por defecto.
 */
export interface RegisterDto {
  email: string;
  password: string;
  nombre: string;
  rol?: Rol;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

// ============================================================
// BUSINESS LOGIC TYPES
// ============================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface UserResponse {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  createdAt: Date;
}

export interface TicketWithRelations {
  id: string;
  titulo: string;
  descripcion: string;
  estado: string;
  prioridad: string;
  nivelEscalamiento: string;
  cliente: {
    id: string;
    nombre: string;
    email: string;
    tipo: string;
  };
  agenteAsignado?: {
    id: string;
    nombre: string;
    email: string;
    nivel: string;
  } | null;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  fechaResolucion?: Date | null;
  tiempoResolucion?: number | null;
}

// ============================================================
// CLASES DE ERROR
// ============================================================

/**
 * Error base de la aplicación.
 * isOperational distingue errores esperados (404, 400) de bugs inesperados.
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
  ) {
    super(message);
    // Necesario para que instanceof funcione correctamente tras compilar con TypeScript
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Recurso no encontrado") {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "No autorizado") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Acceso denegado") {
    super(message, 403);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Error de validación") {
    super(message, 400);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Conflicto") {
    super(message, 409);
  }
}
