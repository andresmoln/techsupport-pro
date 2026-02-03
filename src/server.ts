import express from "express";
import cors from "cors";
import { config, validateConfig } from "./config/env.config";
import { checkDatabaseConnection } from "./config/database.config";
import { connectMongoDB } from "./config/mongodb.config";
import { connectRedis } from "./config/redis.config";
import { logger } from "./config/logger.config";

import { errorHandler } from "./shared/middleware/errorHandler";
import {
  generalRateLimiter,
  requestTimeout,
  securityHeaders,
  requestLogger,
} from "./shared/middleware/security.middleware";

// TODO: Descomentar rutas cuando se creen los módulos
import { authRoutes } from "./modules/auth/auth.routes";
// import { ticketRoutes } from "./modules/tickets/ticket.routes";
// import { clientRoutes } from "./modules/users/client.routes";
// import { logRoutes } from "./modules/logs/log.routes";
// import { queueRoutes } from "./modules/logs/queue.routes";

const app = express();

// Middlewares globales (se ejecutan en orden)
app.use(requestLogger);
app.use(securityHeaders);
app.use(
  cors({
    origin:
      config.nodeEnv === "production"
        ? process.env.ALLOWED_ORIGINS?.split(",") || []
        : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(generalRateLimiter);
app.use(requestTimeout);

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "TechSupport Pro API está funcionando",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// TODO: Descomentar cuando se creen los módulos
app.use("/api/auth", authRoutes);
// app.use("/api/tickets", ticketRoutes);
// app.use("/api/clients", clientRoutes);
// app.use("/api/logs", logRoutes);
// app.use("/api/queues", queueRoutes);

// 404 para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// Error handler debe ser siempre el último middleware
app.use(errorHandler);

/**
 * Conecta a PostgreSQL, MongoDB y Redis en paralelo.
 */
const connectDatabases = async (): Promise<void> => {
  logger.info("Conectando a bases de datos...");

  await Promise.all([
    checkDatabaseConnection(),
    connectMongoDB(),
    connectRedis(),
  ]);

  logger.info("Todas las conexiones establecidas");
};

/**
 * Inicia el servidor HTTP.
 */
const startServer = async (): Promise<void> => {
  try {
    validateConfig();
    await connectDatabases();

    app.listen(config.port, () => {
      logger.info("Servidor iniciado", {
        port: config.port,
        environment: config.nodeEnv,
        url: `http://localhost:${config.port}`,
      });

      console.log("\n========================================");
      console.log("  🎉 TechSupport Pro API");
      console.log("========================================");
      console.log(`  Puerto:      ${config.port}`);
      console.log(`  Entorno:     ${config.nodeEnv}`);
      console.log(`  Health:      http://localhost:${config.port}/health`);
      console.log("========================================\n");
    });
  } catch (error) {
    logger.error("Error iniciando servidor", { error });
    process.exit(1);
  }
};

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", { reason });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", { error });
  process.exit(1);
});

startServer();

export default app;
