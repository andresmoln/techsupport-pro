import { Response } from "express";
import { AuthRequest } from "../../shared/types";
import { ClientService } from "./client.service";
import { logInfo } from "../../config/logger.config";

export class ClientController {
  private clientService: ClientService;

  constructor() {
    this.clientService = new ClientService();
  }

  /**
   * POST /api/clients
   * Crear un nuevo cliente.
   */
  createClient = async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await this.clientService.createClient(req.body);

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
  };

  /**
   * GET /api/clients
   * Obtener todos los clientes con paginación.
   */
  getClients = async (req: AuthRequest, res: Response): Promise<void> => {
    const pagination = {
      page: req.query.page ? Number(req.query.page) : 1,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : 10,
    };

    const result = await this.clientService.getClients(pagination);

    res.json({
      success: true,
      ...result,
    });
  };

  /**
   * GET /api/clients/:id
   * Obtener un cliente por ID con sus tickets.
   */
  getClientById = async (req: AuthRequest, res: Response): Promise<void> => {
    const clientId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const client = await this.clientService.getClientById(clientId);

    res.json({
      success: true,
      data: client,
    });
  };

  /**
   * PUT /api/clients/:id
   * Actualizar un cliente.
   */
  updateClient = async (req: AuthRequest, res: Response): Promise<void> => {
    const clientId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const client = await this.clientService.updateClient(clientId, req.body);

    logInfo("Cliente actualizado", { clientId: client.id });

    res.json({
      success: true,
      message: "Cliente actualizado exitosamente",
      data: client,
    });
  };

  /**
   * DELETE /api/clients/:id
   * Eliminar un cliente.
   */
  deleteClient = async (req: AuthRequest, res: Response): Promise<void> => {
    const clientId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    await this.clientService.deleteClient(clientId);

    logInfo("Cliente eliminado", { clientId });

    res.json({
      success: true,
      message: "Cliente eliminado exitosamente",
    });
  };
}
