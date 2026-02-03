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
   * Crear un nuevo ticket.
   * La prioridad se asigna automáticamente según el tipo de cliente.
   */
  async createTicket(data: CreateTicketDto, userId: string, userRol: Rol) {
    // Verificar que el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id: data.clienteId },
    });

    if (!cliente) {
      throw new NotFoundError("Cliente no encontrado");
    }

    // Si se asigna agente, verificar que existe
    if (data.agenteAsignadoId) {
      const agente = await prisma.agente.findUnique({
        where: { id: data.agenteAsignadoId },
      });

      if (!agente || !agente.activo) {
        throw new NotFoundError("Agente no encontrado o inactivo");
      }
    }

    // Asignar prioridad según tipo de cliente
    const prioridad =
      cliente.tipo === TipoCliente.VIP ? Prioridad.ALTA : Prioridad.MEDIA;

    // Crear el ticket
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
   * Obtener tickets con filtros y paginación.
   * Los agentes solo ven tickets asignados a ellos.
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

    // Construir filtros
    const where: any = {
      deletedAt: null, // Excluir tickets con soft delete
    };

    // Si es agente, solo puede ver sus tickets
    if (userRol === Rol.AGENTE) {
      const agente = await prisma.agente.findUnique({
        where: { usuarioId: userId },
      });

      if (!agente) {
        throw new ForbiddenError("No tienes un perfil de agente asociado");
      }

      where.agenteAsignadoId = agente.id;
    }

    // Aplicar filtros adicionales
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
        where.fechaHasta.lte = filters.fechaHasta;
      }
    }

    // Ejecutar consultas en paralelo
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
   * Obtener un ticket por ID.
   * Los agentes solo pueden ver sus propios tickets.
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

    // Si es agente, verificar que el ticket le pertenece
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
   * Actualizar un ticket.
   * Aplica reglas de negocio y calcula tiempo de resolución.
   */
  async updateTicket(
    ticketId: string,
    data: UpdateTicketDto,
    userId: string,
    userRol: Rol,
  ) {
    const ticket = await this.getTicketById(ticketId, userId, userRol);

    // Validar transición de estado
    if (data.estado) {
      this.validateEstadoTransition(ticket.estado, data.estado as EstadoTicket);
    }

    // Si se asigna agente, verificar que existe y validar nivel
    if (data.agenteAsignadoId) {
      const agente = await prisma.agente.findUnique({
        where: { id: data.agenteAsignadoId },
      });

      if (!agente || !agente.activo) {
        throw new NotFoundError("Agente no encontrado o inactivo");
      }

      // Validar que el agente tenga el nivel adecuado para tickets escalados
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

    // Preparar datos de actualización
    const updateData: any = {
      titulo: data.titulo,
      descripcion: data.descripcion,
      estado: data.estado as EstadoTicket | undefined,
      agenteAsignadoId: data.agenteAsignadoId,
    };

    // Si se resuelve el ticket, calcular tiempo de resolución
    if (
      data.estado === EstadoTicket.RESUELTO &&
      ticket.estado !== EstadoTicket.RESUELTO
    ) {
      const now = new Date();
      const tiempoResolucion = Math.floor(
        (now.getTime() - ticket.fechaCreacion.getTime()) / (1000 * 60),
      ); // en minutos

      updateData.fechaResolucion = now;
      updateData.tiempoResolucion = tiempoResolucion;
    }

    // Actualizar el ticket
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
   * Eliminar un ticket (soft delete).
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
   * Escalar tickets que excedan el SLA.
   * Este método se ejecutará periódicamente con un cron job.
   */
  async escalarTicketsPorSLA() {
    const now = new Date();

    // Obtener tickets abiertos sin resolver
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

      // Si excede el SLA, escalar
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
   * Validar transición de estado.
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
