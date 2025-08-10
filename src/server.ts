import { createServer } from 'http';
import { Server } from 'socket.io';
import { instrument } from "@socket.io/admin-ui";
import app from './app';
import { config } from './config/config';
import { logger } from './utils/logger';
import { initializeDatabase } from './database/database';
import { initializeSocket } from './socket/socketHandler';

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

async function startServer(): Promise<void> {
  try {
    // Initialize database
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Create HTTP server
    const server = createServer(app);

    // Initialize Socket.IO
    const io = new Server(server, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Initialize socket handlers
    initializeSocket(io);
    instrument(io, {
      auth: false // Set to true in production with proper auth
    });

    // Start server
    server.listen(config.port, config.host, () => {
      logger.info(`Server running on ${config.host}:${config.port} in ${config.nodeEnv} mode`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close(() => {
        logger.info('HTTP server closed');
        
        // Close database connections
        // db.destroy() if using Knex
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();