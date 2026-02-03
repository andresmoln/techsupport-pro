import { Response } from "express";
import { AuthRequest } from "../../shared/types";
import { TicketService } from "./ticket.service";
import { logInfo } from "../../config/logger.config";

const ticketService = new TicketService();

export class TicketController {
  /**
   * POST /api/tickets
   * Crear un nuevo ticket.
   */
  async createTicket(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, message: "No autenticado" });
      return;
    }

    const ticket = await ticketService.createTicket(
      req.body,
      req.user.userId,
      req.user.rol,
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
  }

  /**
   * GET /api/tickets
   * Obtener tickets con filtros y paginación.
   */
  async getTickets(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, message: "No autenticado" });
      return;
    }

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
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      pageSize: req.query.pageSize
        ? parseInt(req.query.pageSize as string, 10)
        : 10,
    };

    const result = await ticketService.getTickets(
      filters,
      pagination,
      req.user.userId,
      req.user.rol,
    );

    res.json({
      success: true,
      ...result,
    });
  }

  /**
   * GET /api/tickets/:id
   * Obtener un ticket por ID.
   */
  async getTicketById(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, message: "No autenticado" });
      return;
    }

    const ticket = await ticketService.getTicketById(
      req.params.id,
      req.user.userId,
      req.user.rol,
    );

    res.json({
      success: true,
      data: ticket,
    });
  }

  /**
   * PUT /api/tickets/:id
   * Actualizar un ticket.
   */
  async updateTicket(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, message: "No autenticado" });
      return;
    }

    const ticket = await ticketService.updateTicket(
      req.params.id,
      req.body,
      req.user.userId,
      req.user.rol,
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
  }

  /**
   * DELETE /api/tickets/:id
   * Eliminar un ticket (soft delete).
   */
  async deleteTicket(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, message: "No autenticado" });
      return;
    }

    await ticketService.deleteTicket(
      req.params.id,
      req.user.userId,
      req.user.rol,
    );

    logInfo("Ticket eliminado", { ticketId: req.params.id });

    res.json({
      success: true,
      message: "Ticket eliminado exitosamente",
    });
  }

  /**
   * POST /api/tickets/escalar-sla
   * Ejecutar escalamiento automático por SLA.
   * Solo ADMIN y SUPERVISOR pueden ejecutar esto manualmente.
   */
  async escalarPorSLA(req: AuthRequest, res: Response): Promise<void> {
    const result = await ticketService.escalarTicketsPorSLA();

    logInfo("Escalamiento SLA ejecutado", result);

    res.json({
      success: true,
      message: "Escalamiento ejecutado",
      data: result,
    });
  }
}
