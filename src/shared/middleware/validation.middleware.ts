import { Request, Response, NextFunction } from "express";
import { ValidationError } from "../types";

/**
 * Middleware de Validación de Inputs
 *
 * ¿Por qué es importante?
 * - Evita que datos basura lleguen a la base de datos
 * - Previene inyección SQL y XSS
 * - Da errores descriptivos al cliente
 * - Es la PRIMERA línea de defensa
 */

// ============================================
// Funciones de validación individuales
// ============================================

/**
 * Validar que un email sea válido
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validar que un string no esté vacío y no exceda un largo máximo
 */
const isValidString = (
  value: string,
  minLength: number = 1,
  maxLength: number = 255,
): boolean => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength;
};

/**
 * Validar que un string sea un UUID válido
 */
const isValidUUID = (value: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Validar que un string sea una fecha ISO válida
 */
const isValidDate = (value: string): boolean => {
  const date = new Date(value);
  return !isNaN(date.getTime());
};

/**
 * Escapear caracteres HTML para prevenir XSS
 */
const sanitizeString = (value: string): string => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// ============================================
// Validadores por módulo
// ============================================

/**
 * Validar datos de login
 */
export const validateLogin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors: Record<string, string> = {};
  const { email, password } = req.body || {};

  if (!email) {
    errors.email = "Email es requerido";
  } else if (typeof email !== "string") {
    errors.email = "Email debe ser un string";
  } else if (!isValidEmail(email)) {
    errors.email = "Email no es válido";
  }

  if (!password) {
    errors.password = "Contraseña es requerida";
  } else if (typeof password !== "string") {
    errors.password = "Contraseña debe ser un string";
  } else if (password.length < 6) {
    errors.password = "Contraseña debe tener al menos 6 caracteres";
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(JSON.stringify(errors));
  }

  next();
};

/**
 * Validar datos de registro de usuario
 */
export const validateRegister = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors: Record<string, string> = {};
  const { email, password, nombre, rol } = req.body || {};

  // Email
  if (!email) {
    errors.email = "Email es requerido";
  } else if (!isValidEmail(email)) {
    errors.email = "Email no es válido";
  }

  // Password
  if (!password) {
    errors.password = "Contraseña es requerida";
  } else if (typeof password !== "string" || password.length < 6) {
    errors.password = "Contraseña debe tener al menos 6 caracteres";
  } else if (password.length > 100) {
    errors.password = "Contraseña no puede tener más de 100 caracteres";
  }

  // Nombre
  if (!nombre) {
    errors.nombre = "Nombre es requerido";
  } else if (!isValidString(nombre, 2, 100)) {
    errors.nombre = "Nombre debe tener entre 2 y 100 caracteres";
  }

  // Rol (opcional, pero si lo envían debe ser válido)
  const validRoles = ["ADMIN", "SUPERVISOR", "AGENTE"];
  if (rol && !validRoles.includes(rol)) {
    errors.rol = `Rol no es válido. Opciones: ${validRoles.join(", ")}`;
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(JSON.stringify(errors));
  }

  // Sanitizar inputs (prevenir XSS)
  if (req.body.nombre) {
    req.body.nombre = sanitizeString(req.body.nombre);
  }

  next();
};

/**
 * Validar datos de creación de ticket
 */
export const validateCreateTicket = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors: Record<string, string> = {};
  const { titulo, descripcion, clienteId, agenteAsignadoId } = req.body || {};

  // Título
  if (!titulo) {
    errors.titulo = "Título es requerido";
  } else if (!isValidString(titulo, 3, 200)) {
    errors.titulo = "Título debe tener entre 3 y 200 caracteres";
  }

  // Descripción
  if (!descripcion) {
    errors.descripcion = "Descripción es requerida";
  } else if (!isValidString(descripcion, 5, 5000)) {
    errors.descripcion = "Descripción debe tener entre 5 y 5000 caracteres";
  }

  // Cliente ID
  if (!clienteId) {
    errors.clienteId = "ID de cliente es requerido";
  } else if (!isValidUUID(clienteId)) {
    errors.clienteId = "ID de cliente no es válido";
  }

  // Agente (opcional, pero si lo envían debe ser UUID válido)
  if (agenteAsignadoId && !isValidUUID(agenteAsignadoId)) {
    errors.agenteAsignadoId = "ID de agente no es válido";
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(JSON.stringify(errors));
  }

  // Sanitizar
  if (req.body.titulo) req.body.titulo = sanitizeString(req.body.titulo);
  if (req.body.descripcion)
    req.body.descripcion = sanitizeString(req.body.descripcion);

  next();
};

/**
 * Validar datos de actualización de ticket
 */
export const validateUpdateTicket = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors: Record<string, string> = {};
  const { titulo, descripcion, estado, agenteAsignadoId } = req.body || {};

  // Al menos un campo debe estar presente
  if (!titulo && !descripcion && !estado && !agenteAsignadoId) {
    throw new ValidationError("Se requiere al menos un campo para actualizar");
  }

  // Título (opcional)
  if (titulo !== undefined && !isValidString(titulo, 3, 200)) {
    errors.titulo = "Título debe tener entre 3 y 200 caracteres";
  }

  // Descripción (opcional)
  if (descripcion !== undefined && !isValidString(descripcion, 5, 5000)) {
    errors.descripcion = "Descripción debe tener entre 5 y 5000 caracteres";
  }

  // Estado (opcional, pero debe ser válido)
  const validEstados = [
    "ABIERTO",
    "EN_PROGRESO",
    "RESUELTO",
    "CERRADO",
    "ESCALADO",
  ];
  if (estado && !validEstados.includes(estado)) {
    errors.estado = `Estado no es válido. Opciones: ${validEstados.join(", ")}`;
  }

  // Agente (opcional)
  if (agenteAsignadoId && !isValidUUID(agenteAsignadoId)) {
    errors.agenteAsignadoId = "ID de agente no es válido";
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(JSON.stringify(errors));
  }

  // Sanitizar
  if (req.body.titulo) req.body.titulo = sanitizeString(req.body.titulo);
  if (req.body.descripcion)
    req.body.descripcion = sanitizeString(req.body.descripcion);

  next();
};

/**
 * Validar datos de creación de cliente
 */
export const validateCreateClient = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors: Record<string, string> = {};
  const { nombre, email, tipo, empresa } = req.body || {};

  // Nombre
  if (!nombre) {
    errors.nombre = "Nombre es requerido";
  } else if (!isValidString(nombre, 2, 150)) {
    errors.nombre = "Nombre debe tener entre 2 y 150 caracteres";
  }

  // Email
  if (!email) {
    errors.email = "Email es requerido";
  } else if (!isValidEmail(email)) {
    errors.email = "Email no es válido";
  }

  // Tipo (opcional, default es NORMAL)
  const validTipos = ["VIP", "NORMAL"];
  if (tipo && !validTipos.includes(tipo)) {
    errors.tipo = `Tipo no es válido. Opciones: ${validTipos.join(", ")}`;
  }

  // Empresa (opcional)
  if (
    empresa !== undefined &&
    empresa !== null &&
    !isValidString(empresa, 1, 200)
  ) {
    errors.empresa = "Empresa debe tener entre 1 y 200 caracteres";
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(JSON.stringify(errors));
  }

  // Sanitizar
  if (req.body.nombre) req.body.nombre = sanitizeString(req.body.nombre);
  if (req.body.empresa) req.body.empresa = sanitizeString(req.body.empresa);

  next();
};

/**
 * Validar datos de actualización de cliente
 */
export const validateUpdateClient = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors: Record<string, string> = {};
  const { nombre, email, tipo, empresa } = req.body || {};

  // Al menos un campo debe estar presente
  if (!nombre && !email && !tipo && !empresa) {
    throw new ValidationError("Se requiere al menos un campo para actualizar");
  }

  // Nombre (opcional)
  if (nombre !== undefined && !isValidString(nombre, 2, 150)) {
    errors.nombre = "Nombre debe tener entre 2 y 150 caracteres";
  }

  // Email (opcional)
  if (email !== undefined && !isValidEmail(email)) {
    errors.email = "Email no es válido";
  }

  // Tipo (opcional)
  const validTipos = ["VIP", "NORMAL"];
  if (tipo && !validTipos.includes(tipo)) {
    errors.tipo = `Tipo no es válido. Opciones: ${validTipos.join(", ")}`;
  }

  // Empresa (opcional)
  if (
    empresa !== undefined &&
    empresa !== null &&
    !isValidString(empresa, 1, 200)
  ) {
    errors.empresa = "Empresa debe tener entre 1 y 200 caracteres";
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(JSON.stringify(errors));
  }

  // Sanitizar
  if (req.body.nombre) req.body.nombre = sanitizeString(req.body.nombre);
  if (req.body.empresa) req.body.empresa = sanitizeString(req.body.empresa);

  next();
};

/**
 * Validar parámetros de paginación en query string
 */
export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { page, pageSize } = req.query;

  if (page !== undefined) {
    const pageNum = parseInt(page as string, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      throw new ValidationError("page debe ser un número mayor o igual a 1");
    }
    req.query.page = pageNum.toString();
  }

  if (pageSize !== undefined) {
    const pageSizeNum = parseInt(pageSize as string, 10);
    if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100) {
      throw new ValidationError("pageSize debe ser un número entre 1 y 100");
    }
    req.query.pageSize = pageSizeNum.toString();
  }

  next();
};

/**
 * Validar filtros de fecha en query string
 */
export const validateDateFilters = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const { fechaDesde, fechaHasta } = req.query;

  if (fechaDesde && !isValidDate(fechaDesde as string)) {
    throw new ValidationError(
      "fechaDesde no es una fecha válida (formato ISO)",
    );
  }

  if (fechaHasta && !isValidDate(fechaHasta as string)) {
    throw new ValidationError(
      "fechaHasta no es una fecha válida (formato ISO)",
    );
  }

  // Si ambas están presentes, fechaDesde debe ser menor que fechaHasta
  if (fechaDesde && fechaHasta) {
    const desde = new Date(fechaDesde as string);
    const hasta = new Date(fechaHasta as string);

    if (desde > hasta) {
      throw new ValidationError("fechaDesde no puede ser mayor que fechaHasta");
    }
  }

  next();
};

// Exportar funciones helper para uso externo si es necesario
export { isValidEmail, isValidUUID, isValidString, sanitizeString };
