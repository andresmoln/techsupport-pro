import { Response } from "express";
import { AuthRequest } from "../../shared/types";
import { ClientService } from "./client.service";
import { logInfo } from "../../config/logger.config";

const clientService = new ClientService();

export class ClientController {
  /**
   * POST /api/clients
   * Crear un nuevo cliente.
   */
  async createClient(req: AuthRequest, res: Response): Promise<void> {
    const client = await clientService.createClient(req.body);

    logInfo("Cliente creado", {
      clientId: client.id,
      email: client.email,
      tipo: client.tipo,
    });

    res.status(201).json({
      success: true,
      message: "Cliente creado exitosamente",
      data: client,
    });
  }

  /**
   * GET /api/clients
   * Obtener todos los clientes con paginación.
   */
  async getClients(req: AuthRequest, res: Response): Promise<void> {
    const pagination = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      pageSize: req.query.pageSize
        ? parseInt(req.query.pageSize as string, 10)
        : 10,
    };

    const result = await clientService.getClients(pagination);

    res.json({
      success: true,
      ...result,
    });
  }

  /**
   * GET /api/clients/:id
   * Obtener un cliente por ID con sus tickets.
   */
  async getClientById(req: AuthRequest, res: Response): Promise<void> {
    const client = await clientService.getClientById(req.params.id);

    res.json({
      success: true,
      data: client,
    });
  }

  /**
   * PUT /api/clients/:id
   * Actualizar un cliente.
   */
  async updateClient(req: AuthRequest, res: Response): Promise<void> {
    const client = await clientService.updateClient(req.params.id, req.body);

    logInfo("Cliente actualizado", { clientId: client.id });

    res.json({
      success: true,
      message: "Cliente actualizado exitosamente",
      data: client,
    });
  }

  /**
   * DELETE /api/clients/:id
   * Eliminar un cliente.
   */
  async deleteClient(req: AuthRequest, res: Response): Promise<void> {
    await clientService.deleteClient(req.params.id);

    logInfo("Cliente eliminado", { clientId: req.params.id });

    res.json({
      success: true,
      message: "Cliente eliminado exitosamente",
    });
  }
}
