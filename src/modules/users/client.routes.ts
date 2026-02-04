import { Router } from "express";
import { ClientController } from "./client.controller";
import { asyncHandler } from "../../shared/middleware/errorHandler";
import {
  authenticate,
  authorize,
} from "../../shared/middleware/auth.middleware";
import {
  validateCreateClient,
  validatePagination,
  validateUpdateClient,
} from "../../shared/middleware/validation.middleware";
import { Rol } from "@prisma/client";

const router = Router();
const clientController = new ClientController();

/**
 * Todas las rutas requieren autenticación.
 */
router.use(authenticate);

/**
 * POST /api/clients
 * Crear un nuevo cliente (solo ADMIN y SUPERVISOR).
 */
router.post(
  "/",
  authorize(Rol.ADMIN, Rol.SUPERVISOR),
  validateCreateClient,
  asyncHandler(clientController.createClient.bind(clientController)),
);

/**
 * GET /api/clients
 * Listar clientes con paginación.
 */
router.get(
  "/",
  validatePagination,
  asyncHandler(clientController.getClients.bind(clientController)),
);

/**
 * GET /api/clients/:id
 * Obtener un cliente por ID.
 */
router.get(
  "/:id",
  asyncHandler(clientController.getClientById.bind(clientController)),
);

/**
 * PUT /api/clients/:id
 * Actualizar un cliente (solo ADMIN y SUPERVISOR).
 */
router.put(
  "/:id",
  authorize(Rol.ADMIN, Rol.SUPERVISOR),
  validateUpdateClient,
  asyncHandler(clientController.updateClient.bind(clientController)),
);

/**
 * DELETE /api/clients/:id
 * Eliminar un cliente (solo ADMIN).
 */
router.delete(
  "/:id",
  authorize(Rol.ADMIN),
  asyncHandler(clientController.deleteClient.bind(clientController)),
);

export { router as clientRoutes };
