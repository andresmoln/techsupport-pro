import mongoose from "mongoose";
import { config } from "./env.config";

/**
 * Conexión centralizada a MongoDB.
 *
 * MongoDB se utiliza para:
 * - Almacenamiento de logs históricos
 * - Reportes
 * - Analytics
 */

let isConnected = false;

/**
 * Establece la conexión con MongoDB.
 * Reutiliza la conexión existente para evitar múltiples conexiones activas.
 */
export const connectMongoDB = async (): Promise<void> => {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(config.mongodbUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log("Conexión a MongoDB establecida");

    /**
     * Eventos de conexión para observabilidad y monitoreo
     */
    mongoose.connection.on("error", (error) => {
      console.error("Error en la conexión a MongoDB:", error);
      isConnected = false;
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB desconectado");
      isConnected = false;
    });
  } catch (error) {
    isConnected = false;
    console.error("Error al conectar con MongoDB:", error);
    throw error;
  }
};

/**
 * Cierra explícitamente la conexión con MongoDB.
 * Útil para entornos de testing o apagado controlado de la aplicación.
 */
export const disconnectMongoDB = async (): Promise<void> => {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log("Conexión a MongoDB cerrada");
  } catch (error) {
    console.error("Error al desconectar MongoDB:", error);
    throw error;
  }
};

/**
 * Indica si la aplicación mantiene una conexión activa con MongoDB.
 */
export const isMongoDBConnected = (): boolean => {
  return isConnected && mongoose.connection.readyState === 1;
};
