import { PrismaClient } from "@prisma/client";

/**
 * Extensión del objeto global de Node.js para almacenar
 * una única instancia de PrismaClient.
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Inicialización del cliente Prisma.
 *
 * En entornos de desarrollo se reutiliza la instancia global
 * para evitar múltiples conexiones durante hot-reload.
 *
 * En producción, el ciclo de vida del cliente está ligado
 * al proceso de la aplicación.
 */
export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

/**
 * Cierra explícitamente la conexión a la base de datos.
 * Utilizado principalmente en pruebas automatizadas
 * o apagados controlados de la aplicación.
 */
export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect();
};

/**
 * Verifica la conectividad con la base de datos ejecutando
 * una consulta mínima.
 */
export const checkDatabaseConnection = async (): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("Conexión a PostgreSQL exitosa");
  } catch (error) {
    console.error("Error conectando a PostgreSQL:", error);
    throw error;
  }
};
