import {
  PrismaClient,
  TipoCliente,
  Rol,
  NivelEscalamiento,
  EstadoTicket,
  Prioridad,
} from "@prisma/client";

import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando proceso de seed de base de datos");

  // Limpieza de datos respetando el orden de dependencias
  console.log("Eliminando datos existentes");
  await prisma.ticket.deleteMany();
  await prisma.agente.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.usuario.deleteMany();

  // ===============================
  // USUARIOS
  // ===============================

  const hashedPassword = await bcrypt.hash("password123", 10);

  await prisma.usuario.create({
    data: {
      email: "admin@techsupport.com",
      password: hashedPassword,
      nombre: "María García",
      rol: Rol.ADMIN,
    },
  });

  await prisma.usuario.create({
    data: {
      email: "supervisor@techsupport.com",
      password: hashedPassword,
      nombre: "Carlos Rodríguez",
      rol: Rol.SUPERVISOR,
    },
  });

  const usuarioAgente1 = await prisma.usuario.create({
    data: {
      email: "agente1@techsupport.com",
      password: hashedPassword,
      nombre: "Ana Martínez",
      rol: Rol.AGENTE,
    },
  });

  const usuarioAgente2 = await prisma.usuario.create({
    data: {
      email: "agente2@techsupport.com",
      password: hashedPassword,
      nombre: "Luis Fernández",
      rol: Rol.AGENTE,
    },
  });

  const usuarioAgente3 = await prisma.usuario.create({
    data: {
      email: "agente3@techsupport.com",
      password: hashedPassword,
      nombre: "Pedro Sánchez",
      rol: Rol.AGENTE,
    },
  });

  // ===============================
  // AGENTES
  // ===============================

  const agente1 = await prisma.agente.create({
    data: {
      nombre: "Ana Martínez",
      email: "agente1@techsupport.com",
      nivel: NivelEscalamiento.NIVEL_1,
      usuarioId: usuarioAgente1.id,
    },
  });

  const agente2 = await prisma.agente.create({
    data: {
      nombre: "Luis Fernández",
      email: "agente2@techsupport.com",
      nivel: NivelEscalamiento.NIVEL_2,
      usuarioId: usuarioAgente2.id,
    },
  });

  const agente3 = await prisma.agente.create({
    data: {
      nombre: "Pedro Sánchez",
      email: "agente3@techsupport.com",
      nivel: NivelEscalamiento.NIVEL_3,
      usuarioId: usuarioAgente3.id,
    },
  });

  // ===============================
  // CLIENTES
  // ===============================

  const clienteVIP1 = await prisma.cliente.create({
    data: {
      nombre: "Banco Nacional",
      email: "soporte@banconacional.com",
      tipo: TipoCliente.VIP,
      empresa: "Banco Nacional S.A.",
    },
  });

  const clienteVIP2 = await prisma.cliente.create({
    data: {
      nombre: "TechCorp Internacional",
      email: "it@techcorp.com",
      tipo: TipoCliente.VIP,
      empresa: "TechCorp Internacional Inc.",
    },
  });

  const clienteNormal1 = await prisma.cliente.create({
    data: {
      nombre: "Distribuidora López",
      email: "contacto@distlopez.com",
      tipo: TipoCliente.NORMAL,
      empresa: "Distribuidora López",
    },
  });

  const clienteNormal2 = await prisma.cliente.create({
    data: {
      nombre: "Restaurante El Buen Sabor",
      email: "admin@elbuensabor.com",
      tipo: TipoCliente.NORMAL,
      empresa: "Restaurante El Buen Sabor",
    },
  });

  const clienteNormal3 = await prisma.cliente.create({
    data: {
      nombre: "Librería Cervantes",
      email: "info@libreriacervantes.com",
      tipo: TipoCliente.NORMAL,
      empresa: "Librería Cervantes",
    },
  });

  // ===============================
  // TICKETS
  // ===============================

  // Ticket VIP abierto, sin agente asignado
  await prisma.ticket.create({
    data: {
      titulo: "Falla crítica en sistema de pagos",
      descripcion:
        "El sistema de pagos no procesa transacciones desde las 08:00 AM. Afecta a todos los cajeros.",
      estado: EstadoTicket.ABIERTO,
      prioridad: Prioridad.ALTA,
      clienteId: clienteVIP1.id,
    },
  });

  // Ticket VIP en progreso, asignado a agente nivel 1
  await prisma.ticket.create({
    data: {
      titulo: "Error en reportes financieros mensuales",
      descripcion:
        "Los reportes del mes de enero muestran cifras incorrectas en el balance general.",
      estado: EstadoTicket.EN_PROGRESO,
      prioridad: Prioridad.ALTA,
      clienteId: clienteVIP2.id,
      agenteAsignadoId: agente1.id,
    },
  });

  // Ticket VIP escalado a nivel 2
  await prisma.ticket.create({
    data: {
      titulo: "Sistema completo caído en sede central",
      descripcion:
        "Ningún módulo responde desde las 07:30 AM. Ya se intentó reiniciar el servidor sin resultado.",
      estado: EstadoTicket.ESCALADO,
      prioridad: Prioridad.ALTA,
      nivelEscalamiento: NivelEscalamiento.NIVEL_2,
      clienteId: clienteVIP1.id,
      agenteAsignadoId: agente2.id,
    },
  });

  // Ticket VIP resuelto con tiempo de resolución
  await prisma.ticket.create({
    data: {
      titulo: "Integración con sistema de CRM fallando",
      descripcion:
        "La conexión entre el sistema interno y el CRM externo se desconecta cada 10 minutos.",
      estado: EstadoTicket.RESUELTO,
      prioridad: Prioridad.ALTA,
      clienteId: clienteVIP2.id,
      agenteAsignadoId: agente2.id,
      fechaResolucion: new Date(),
      tiempoResolucion: 90,
    },
  });

  // Ticket normal abierto, sin agente
  await prisma.ticket.create({
    data: {
      titulo: "Problema con impresora de tickets",
      descripcion:
        "La impresora de recibos no imprime desde ayer por la tarde.",
      estado: EstadoTicket.ABIERTO,
      prioridad: Prioridad.MEDIA,
      clienteId: clienteNormal1.id,
    },
  });

  // Ticket normal en progreso
  await prisma.ticket.create({
    data: {
      titulo: "Pantalla de login no carga en Firefox",
      descripcion:
        "En Chrome funciona correctamente pero en Firefox la página se queda en blanco.",
      estado: EstadoTicket.EN_PROGRESO,
      prioridad: Prioridad.MEDIA,
      clienteId: clienteNormal2.id,
      agenteAsignadoId: agente1.id,
    },
  });

  // Ticket normal resuelto
  await prisma.ticket.create({
    data: {
      titulo: "Consulta sobre facturación automática",
      descripcion:
        "Solicitud de información sobre cómo configurar facturas automáticas mensuales.",
      estado: EstadoTicket.RESUELTO,
      prioridad: Prioridad.MEDIA,
      clienteId: clienteNormal1.id,
      agenteAsignadoId: agente1.id,
      fechaResolucion: new Date(),
      tiempoResolucion: 45,
    },
  });

  // Ticket normal cerrado
  await prisma.ticket.create({
    data: {
      titulo: "Contraseña olvidada en cuenta de administrador",
      descripcion:
        "El usuario administrador no puede ingresar por olvidar su contraseña.",
      estado: EstadoTicket.CERRADO,
      prioridad: Prioridad.MEDIA,
      clienteId: clienteNormal3.id,
      agenteAsignadoId: agente1.id,
      fechaResolucion: new Date(),
      tiempoResolucion: 15,
    },
  });

  // Ticket normal escalado a nivel 3
  await prisma.ticket.create({
    data: {
      titulo: "Pérdida de datos en migración de base de datos",
      descripcion:
        "Durante la migración programada se perdieron registros de los últimos 3 días. Se requiere restauración.",
      estado: EstadoTicket.ESCALADO,
      prioridad: Prioridad.ALTA,
      nivelEscalamiento: NivelEscalamiento.NIVEL_3,
      clienteId: clienteNormal2.id,
      agenteAsignadoId: agente3.id,
    },
  });

  // Ticket normal con soft delete
  await prisma.ticket.create({
    data: {
      titulo: "Ticket de prueba eliminado",
      descripcion:
        "Este ticket fue creado por error y later eliminado con soft delete.",
      estado: EstadoTicket.ABIERTO,
      prioridad: Prioridad.BAJA,
      clienteId: clienteNormal3.id,
      deletedAt: new Date(),
    },
  });

  console.log("Seed ejecutado correctamente");
  console.log("\nCredenciales de acceso:");
  console.log("  Admin:      admin@techsupport.com / password123");
  console.log("  Supervisor: supervisor@techsupport.com / password123");
  console.log("  Agente 1:   agente1@techsupport.com / password123");
  console.log("  Agente 2:   agente2@techsupport.com / password123");
  console.log("  Agente 3:   agente3@techsupport.com / password123");
}

main()
  .catch((error) => {
    console.error("Error durante la ejecución del seed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
