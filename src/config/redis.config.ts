import Redis from "ioredis";
import { config } from "./env.config";

/**
 * Cliente Redis centralizado.
 *
 * Redis se utiliza para:
 * - Sistema de colas (Bull)
 * - Rate limiting
 * - Cache (opcional)
 */

/**
 * Instancia del cliente Redis.
 * Se configura con reconexión controlada y conexión diferida.
 */
export const redisClient = new Redis({
  host: config.redisHost,
  port: config.redisPort,
  maxRetriesPerRequest: 3, // número máximo de reintentos por request
  retryStrategy: (times: number): number => {
    /**
     * Estrategia de reintento progresivo.
     * Incrementa el tiempo de espera entre intentos hasta un máximo.
     */
    return Math.min(times * 50, 2000);
  },
  lazyConnect: true, // la conexión se establece manualmente
});

/**
 * Establece la conexión con Redis.
 */
export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    console.log("Conexión a Redis establecida");

    /**
     * Eventos del cliente Redis para monitoreo y observabilidad.
     */
    redisClient.on("error", (error) => {
      console.error("Error en Redis:", error);
    });

    redisClient.on("reconnecting", () => {
      console.warn("Intentando reconectar a Redis");
    });

    redisClient.on("close", () => {
      console.warn("Conexión a Redis cerrada");
    });
  } catch (error) {
    console.error("Error al conectar con Redis:", error);
    throw error;
  }
};

/**
 * Cierra la conexión con Redis de forma controlada.
 */
export const disconnectRedis = async (): Promise<void> => {
  try {
    await redisClient.quit();
    console.log("Conexión a Redis cerrada");
  } catch (error) {
    console.error("Error al desconectar Redis:", error);
    throw error;
  }
};

/**
 * Verifica la disponibilidad de Redis ejecutando un comando PING.
 */
export const checkRedisConnection = async (): Promise<void> => {
  try {
    const response = await redisClient.ping();

    if (response !== "PONG") {
      throw new Error("Redis no respondió correctamente al comando PING");
    }

    console.log("Redis responde correctamente");
  } catch (error) {
    console.error("Error al verificar la conexión con Redis:", error);
    throw error;
  }
};
