import { prisma } from "../../config/database.config";
import { config } from "../../config/env.config";
import {
  CreateTicketDto,
  UpdateTicketDto,
  TicketFilters,
  PaginationParams,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../shared/types";
import {
  EstadoTicket,
  Prioridad,
  NivelEscalamiento,
  TipoCliente,
  Rol,
} from "@prisma/client";

export class TicketService {
  /**
   * Crear ticket con prioridad asignada automáticamente según tipo de cliente.
   * VIP → ALTA, NORMAL → MEDIA.
   */
  async createTicket(data: CreateTicketDto, userId: string, userRol: Rol) {
    const cliente = await prisma.cliente.findUnique({
      where: { id: data.clienteId },
    });

    if (!cliente) {
      throw new NotFoundError("Cliente no encontrado");
    }

    if (data.agenteAsignadoId) {
      const agente = await prisma.agente.findUnique({
        where: { id: data.agenteAsignadoId },
      });

      if (!agente || !agente.activo) {
        throw new NotFoundError("Agente no encontrado o inactivo");
      }
    }

    const prioridad =
      cliente.tipo === TipoCliente.VIP ? Prioridad.ALTA : Prioridad.MEDIA;

    const ticket = await prisma.ticket.create({
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion,
        clienteId: data.clienteId,
        agenteAsignadoId: data.agenteAsignadoId,
        prioridad,
        estado: EstadoTicket.ABIERTO,
        nivelEscalamiento: NivelEscalamiento.NIVEL_1,
      },
      include: {
        cliente: true,
        agenteAsignado: true,
      },
    });

    return ticket;
  }

  /**
   * Listar tickets con filtros y paginación.
   * Agentes solo ven tickets asignados a ellos.
   */
  async getTickets(
    filters: TicketFilters,
    pagination: PaginationParams,
    userId: string,
    userRol: Rol,
  ) {
    const page = pagination.page || 1;
    const pageSize = Math.min(pagination.pageSize || 10, 100);
    const skip = (page - 1) * pageSize;

    const where: any = {
      deletedAt: null,
    };

    if (userRol === Rol.AGENTE) {
      const agente = await prisma.agente.findUnique({
        where: { usuarioId: userId },
      });

      if (!agente) {
        throw new ForbiddenError("No tienes un perfil de agente asociado");
      }

      where.agenteAsignadoId = agente.id;
    }

    if (filters.estado) {
      where.estado = filters.estado as EstadoTicket;
    }

    if (filters.prioridad) {
      where.prioridad = filters.prioridad as Prioridad;
    }

    if (filters.clienteId) {
      where.clienteId = filters.clienteId;
    }

    if (filters.agenteAsignadoId) {
      where.agenteAsignadoId = filters.agenteAsignadoId;
    }

    if (filters.fechaDesde || filters.fechaHasta) {
      where.fechaCreacion = {};

      if (filters.fechaDesde) {
        where.fechaCreacion.gte = filters.fechaDesde;
      }

      if (filters.fechaHasta) {
        where.fechaCreacion.lte = filters.fechaHasta;
      }
    }

    const [tickets, totalItems] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          cliente: true,
          agenteAsignado: true,
        },
        orderBy: {
          fechaCreacion: "desc",
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      data: tickets,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Obtener ticket por ID.
   * Agentes solo pueden ver sus propios tickets.
   */
  async getTicketById(ticketId: string, userId: string, userRol: Rol) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        cliente: true,
        agenteAsignado: true,
      },
    });

    if (!ticket || ticket.deletedAt) {
      throw new NotFoundError("Ticket no encontrado");
    }

    if (userRol === Rol.AGENTE) {
      const agente = await prisma.agente.findUnique({
        where: { usuarioId: userId },
      });

      if (!agente || ticket.agenteAsignadoId !== agente.id) {
        throw new ForbiddenError("No tienes permiso para ver este ticket");
      }
    }

    return ticket;
  }

  /**
   * Actualizar ticket con validación de transiciones de estado
   * y restricciones de nivel de agente para tickets escalados.
   * Calcula automáticamente el tiempo de resolución.
   */
  async updateTicket(
    ticketId: string,
    data: UpdateTicketDto,
    userId: string,
    userRol: Rol,
  ) {
    const ticket = await this.getTicketById(ticketId, userId, userRol);

    if (data.estado) {
      this.validateEstadoTransition(ticket.estado, data.estado as EstadoTicket);
    }

    if (data.agenteAsignadoId) {
      const agente = await prisma.agente.findUnique({
        where: { id: data.agenteAsignadoId },
      });

      if (!agente || !agente.activo) {
        throw new NotFoundError("Agente no encontrado o inactivo");
      }

      if (ticket.estado === EstadoTicket.ESCALADO) {
        if (
          ticket.nivelEscalamiento === NivelEscalamiento.NIVEL_2 &&
          agente.nivel === NivelEscalamiento.NIVEL_1
        ) {
          throw new ForbiddenError(
            "Agentes de nivel 1 no pueden atender tickets escalados a nivel 2",
          );
        }

        if (
          ticket.nivelEscalamiento === NivelEscalamiento.NIVEL_3 &&
          (agente.nivel === NivelEscalamiento.NIVEL_1 ||
            agente.nivel === NivelEscalamiento.NIVEL_2)
        ) {
          throw new ForbiddenError(
            "Solo agentes de nivel 3 pueden atender tickets escalados a nivel 3",
          );
        }
      }
    }

    const updateData: any = {
      titulo: data.titulo,
      descripcion: data.descripcion,
      estado: data.estado as EstadoTicket | undefined,
      agenteAsignadoId: data.agenteAsignadoId,
    };

    if (
      data.estado === EstadoTicket.RESUELTO &&
      ticket.estado !== EstadoTicket.RESUELTO
    ) {
      const now = new Date();
      const tiempoResolucion = Math.floor(
        (now.getTime() - ticket.fechaCreacion.getTime()) / (1000 * 60),
      );

      updateData.fechaResolucion = now;
      updateData.tiempoResolucion = tiempoResolucion;
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        cliente: true,
        agenteAsignado: true,
      },
    });

    return updatedTicket;
  }

  /**
   * Soft delete de ticket.
   */
  async deleteTicket(ticketId: string, userId: string, userRol: Rol) {
    const ticket = await this.getTicketById(ticketId, userId, userRol);

    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Escalar tickets que excedieron el SLA.
   * VIP: 2 horas, Normal: 24 horas.
   * Nivel 1 → Nivel 2 → Nivel 3.
   */
  async escalarTicketsPorSLA() {
    const now = new Date();

    const ticketsAbiertos = await prisma.ticket.findMany({
      where: {
        estado: {
          in: [EstadoTicket.ABIERTO, EstadoTicket.EN_PROGRESO],
        },
        deletedAt: null,
      },
      include: {
        cliente: true,
      },
    });

    const ticketsEscalados: string[] = [];

    for (const ticket of ticketsAbiertos) {
      const horasTranscurridas =
        (now.getTime() - ticket.fechaCreacion.getTime()) / (1000 * 60 * 60);

      const slaHoras =
        ticket.cliente.tipo === TipoCliente.VIP
          ? config.slaVipHours
          : config.slaNormalHours;

      if (horasTranscurridas > slaHoras) {
        const nuevoNivel =
          ticket.nivelEscalamiento === NivelEscalamiento.NIVEL_1
            ? NivelEscalamiento.NIVEL_2
            : NivelEscalamiento.NIVEL_3;

        await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            estado: EstadoTicket.ESCALADO,
            nivelEscalamiento: nuevoNivel,
          },
        });

        ticketsEscalados.push(ticket.id);
      }
    }

    return {
      totalRevisados: ticketsAbiertos.length,
      totalEscalados: ticketsEscalados.length,
      ticketsEscalados,
    };
  }

  /**
   * Valida que la transición de estado sea permitida.
   * Previene cambios ilógicos como CERRADO → ABIERTO.
   */
  private validateEstadoTransition(
    estadoActual: EstadoTicket,
    nuevoEstado: EstadoTicket,
  ): void {
    const transicionesValidas: Record<EstadoTicket, EstadoTicket[]> = {
      [EstadoTicket.ABIERTO]: [EstadoTicket.EN_PROGRESO, EstadoTicket.ESCALADO],
      [EstadoTicket.EN_PROGRESO]: [
        EstadoTicket.RESUELTO,
        EstadoTicket.ESCALADO,
      ],
      [EstadoTicket.ESCALADO]: [
        EstadoTicket.EN_PROGRESO,
        EstadoTicket.RESUELTO,
      ],
      [EstadoTicket.RESUELTO]: [EstadoTicket.CERRADO],
      [EstadoTicket.CERRADO]: [],
    };

    if (!transicionesValidas[estadoActual].includes(nuevoEstado)) {
      throw new ValidationError(
        `No se puede cambiar de ${estadoActual} a ${nuevoEstado}`,
      );
    }
  }
}
