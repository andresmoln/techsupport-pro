import { prisma } from "../../config/database.config";
import {
  NotFoundError,
  ConflictError,
  PaginationParams,
} from "../../shared/types";
import { TipoCliente } from "@prisma/client";

interface CreateClientDto {
  nombre: string;
  email: string;
  tipo?: TipoCliente;
  empresa?: string;
}

interface UpdateClientDto {
  nombre?: string;
  email?: string;
  tipo?: TipoCliente;
  empresa?: string;
}

export class ClientService {
  /**
   * Crear un nuevo cliente.
   */
  async createClient(data: CreateClientDto) {
    // Verificar que el email no esté en uso
    const existingClient = await prisma.cliente.findUnique({
      where: { email: data.email },
    });

    if (existingClient) {
      throw new ConflictError("El email ya está registrado");
    }

    const client = await prisma.cliente.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        tipo: data.tipo || TipoCliente.NORMAL,
        empresa: data.empresa,
      },
    });

    return client;
  }

  /**
   * Obtener todos los clientes con paginación.
   */
  async getClients(pagination: PaginationParams) {
    const page = pagination.page || 1;
    const pageSize = Math.min(pagination.pageSize || 10, 100);
    const skip = (page - 1) * pageSize;

    const [clients, totalItems] = await Promise.all([
      prisma.cliente.findMany({
        skip,
        take: pageSize,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          _count: {
            select: {
              tickets: true,
            },
          },
        },
      }),
      prisma.cliente.count(),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      data: clients,
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
   * Obtener un cliente por ID con sus tickets.
   */
  async getClientById(clientId: string) {
    const client = await prisma.cliente.findUnique({
      where: { id: clientId },
      include: {
        tickets: {
          orderBy: {
            fechaCreacion: "desc",
          },
          take: 10,
        },
      },
    });

    if (!client) {
      throw new NotFoundError("Cliente no encontrado");
    }

    return client;
  }

  /**
   * Actualizar un cliente.
   */
  async updateClient(clientId: string, data: UpdateClientDto) {
    const client = await prisma.cliente.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundError("Cliente no encontrado");
    }

    // Si se actualiza el email, verificar que no esté en uso
    if (data.email && data.email !== client.email) {
      const existingClient = await prisma.cliente.findUnique({
        where: { email: data.email },
      });

      if (existingClient) {
        throw new ConflictError("El email ya está en uso");
      }
    }

    const updatedClient = await prisma.cliente.update({
      where: { id: clientId },
      data: {
        nombre: data.nombre,
        email: data.email,
        tipo: data.tipo,
        empresa: data.empresa,
      },
    });

    return updatedClient;
  }

  /**
   * Eliminar un cliente.
   * Solo se puede eliminar si no tiene tickets asociados.
   */
  async deleteClient(clientId: string) {
    const client = await prisma.cliente.findUnique({
      where: { id: clientId },
      include: {
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundError("Cliente no encontrado");
    }

    if (client._count.tickets > 0) {
      throw new ConflictError(
        "No se puede eliminar un cliente con tickets asociados",
      );
    }

    await prisma.cliente.delete({
      where: { id: clientId },
    });
  }
}
