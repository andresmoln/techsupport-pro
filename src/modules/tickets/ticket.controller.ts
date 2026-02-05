import { Response } from "express";
import { AuthRequest } from "../../shared/types";
import { TicketService } from "./ticket.service";
import { logInfo } from "../../config/logger.config";

export class TicketController {
  private ticketService: TicketService;

  constructor() {
    this.ticketService = new TicketService();
  }

  /**
   * POST /api/tickets
   * Crear un nuevo ticket.
   */
  createTicket = async (req: AuthRequest, res: Response): Promise<void> => {
    const ticket = await this.ticketService.createTicket(
      req.body,
      req.user!.userId,
      req.user!.rol,
    );

    logInfo("Ticket creado", {
      ticketId: ticket.id,
      clienteId: ticket.clienteId,
      prioridad: ticket.prioridad,
    });

    res.status(201).json({
      success: true,
      message: "Ticket creado exitosamente",
      data: ticket,
    });
  };

  /**
   * GET /api/tickets
   * Obtener tickets con filtros y paginación.
   */
  getTickets = async (req: AuthRequest, res: Response): Promise<void> => {
    const filters = {
      estado: req.query.estado as string | undefined,
      prioridad: req.query.prioridad as string | undefined,
      clienteId: req.query.clienteId as string | undefined,
      agenteAsignadoId: req.query.agenteAsignadoId as string | undefined,
      fechaDesde: req.query.fechaDesde
        ? new Date(req.query.fechaDesde as string)
        : undefined,
      fechaHasta: req.query.fechaHasta
        ? new Date(req.query.fechaHasta as string)
        : undefined,
    };

    const pagination = {
      page: req.query.page ? Number(req.query.page) : 1,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : 10,
    };

    const result = await this.ticketService.getTickets(
      filters,
      pagination,
      req.user!.userId,
      req.user!.rol,
    );

    res.json({
      success: true,
      ...result,
    });
  };

  /**
   * GET /api/tickets/:id
   * Obtener un ticket por ID.
   */
  getTicketById = async (req: AuthRequest, res: Response): Promise<void> => {
    const ticketId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const ticket = await this.ticketService.getTicketById(
      ticketId,
      req.user!.userId,
      req.user!.rol,
    );

    res.json({
      success: true,
      data: ticket,
    });
  };

  /**
   * PUT /api/tickets/:id
   * Actualizar un ticket.
   */
  updateTicket = async (req: AuthRequest, res: Response): Promise<void> => {
    const ticketId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const ticket = await this.ticketService.updateTicket(
      ticketId,
      req.body,
      req.user!.userId,
      req.user!.rol,
    );

    logInfo("Ticket actualizado", {
      ticketId: ticket.id,
      estado: ticket.estado,
    });

    res.json({
      success: true,
      message: "Ticket actualizado exitosamente",
      data: ticket,
    });
  };

  /**
   * DELETE /api/tickets/:id
   * Eliminar un ticket (soft delete).
   */
  deleteTicket = async (req: AuthRequest, res: Response): Promise<void> => {
    const ticketId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    await this.ticketService.deleteTicket(
      ticketId,
      req.user!.userId,
      req.user!.rol,
    );

    logInfo("Ticket eliminado", { ticketId });

    res.json({
      success: true,
      message: "Ticket eliminado exitosamente",
    });
  };

  /**
   * POST /api/tickets/escalar-sla
   * Ejecutar escalamiento automático por SLA.
   * Solo ADMIN y SUPERVISOR pueden ejecutar esto manualmente.
   */
  escalarPorSLA = async (_req: AuthRequest, res: Response): Promise<void> => {
    const result = await this.ticketService.escalarTicketsPorSLA();

    logInfo("Escalamiento SLA ejecutado", result);

    res.json({
      success: true,
      message: "Escalamiento ejecutado",
      data: result,
    });
  };
}
