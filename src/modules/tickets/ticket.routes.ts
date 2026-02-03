import { Router } from "express";
import { TicketController } from "./ticket.controller";
import { asyncHandler } from "../../shared/middleware/errorHandler";
import {
  authenticate,
  authorize,
} from "../../shared/middleware/auth.middleware";
import {
  validateCreateTicket,
  validateUpdateTicket,
  validatePagination,
  validateDateFilters,
} from "../../shared/middleware/validation.middleware";
import { Rol } from "@prisma/client";

const router = Router();
const ticketController = new TicketController();

/**
 * Todas las rutas requieren autenticación.
 */
router.use(authenticate);

/**
 * POST /api/tickets/escalar-sla
 * Ejecutar escalamiento automático (solo ADMIN y SUPERVISOR).
 */
router.post(
  "/escalar-sla",
  authorize(Rol.ADMIN, Rol.SUPERVISOR),
  asyncHandler(ticketController.escalarPorSLA.bind(ticketController)),
);

/**
 * POST /api/tickets
 * Crear un nuevo ticket.
 */
router.post(
  "/",
  validateCreateTicket,
  asyncHandler(ticketController.createTicket.bind(ticketController)),
);

/**
 * GET /api/tickets
 * Listar tickets con filtros y paginación.
 */
router.get(
  "/",
  validatePagination,
  validateDateFilters,
  asyncHandler(ticketController.getTickets.bind(ticketController)),
);

/**
 * GET /api/tickets/:id
 * Obtener un ticket por ID.
 */
router.get(
  "/:id",
  asyncHandler(ticketController.getTicketById.bind(ticketController)),
);

/**
 * PUT /api/tickets/:id
 * Actualizar un ticket.
 */
router.put(
  "/:id",
  validateUpdateTicket,
  asyncHandler(ticketController.updateTicket.bind(ticketController)),
);

/**
 * DELETE /api/tickets/:id
 * Eliminar un ticket (soft delete).
 * Solo ADMIN y SUPERVISOR pueden eliminar.
 */
router.delete(
  "/:id",
  authorize(Rol.ADMIN, Rol.SUPERVISOR),
  asyncHandler(ticketController.deleteTicket.bind(ticketController)),
);

export { router as ticketRoutes };
