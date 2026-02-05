import mongoose from "mongoose";
import { config } from "./env.config";

let isConnected = false;

export const connectMongoDB = async (): Promise<void> => {
  if (isConnected) return;

  try {
    await mongoose.connect(config.mongodbUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log("Conexión a MongoDB establecida");

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

export const disconnectMongoDB = async (): Promise<void> => {
  if (!isConnected) return;
  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log("Conexión a MongoDB cerrada");
  } catch (error) {
    console.error("Error al desconectar MongoDB:", error);
    throw error;
  }
};

export const isMongoDBConnected = (): boolean => {
  return isConnected && mongoose.connection.readyState === 1;
};
