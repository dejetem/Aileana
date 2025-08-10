import knex, { Knex } from 'knex';
import { config } from '../config/config';
import { logger } from '../utils/logger';

// Database connection configuration
const dbConfig: Knex.Config = {
  client: 'postgresql',
  connection: {
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
  },
  pool: {
    min: 2,
    max: 10,
    createTimeoutMillis: 3000,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './src/database/migrations',
  },
};

export const db: Knex = knex(dbConfig);

// Database health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

// Initialize database (run migrations)
export async function initializeDatabase(): Promise<void> {
  try {
    logger.info('Running database migrations...');
    await db.migrate.latest();
    logger.info('Database migrations completed successfully');

    // Run seeds in development
    // if (config.nodeEnv === 'development') {
    //   logger.info('Running database seeds...');
    //   await db.seed.run();
    //   logger.info('Database seeds completed successfully');
    // }
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

// Graceful database shutdown
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await db.destroy();
    logger.info('Database connection closed successfully');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
}

// Database transaction wrapper
export async function withTransaction<T>(
  callback: (trx: Knex.Transaction) => Promise<T>
): Promise<T> {
  const trx = await db.transaction();
  try {
    const result = await callback(trx);
    await trx.commit();
    return result;
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}