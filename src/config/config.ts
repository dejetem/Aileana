import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  nodeEnv: string;
  port: number;
  host: string;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  onePipe: {
    baseUrl: string;
    apiKey: string;
    secret: string;
    mock: boolean;
  };
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origin: string | string[];
  };
  logging: {
    level: string;
  };
  redis: {
    url: string;
  };
}

const requiredEnvVars = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
];

// Validate required environment variables
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

export const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  
  database: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    name: process.env.DB_NAME!,
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET! + '_refresh',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  onePipe: {
    baseUrl: process.env.ONEPIPE_BASE_URL || 'https://api.onepipe.co/v1',
    apiKey: process.env.ONEPIPE_API_KEY || 'mock_key',
    secret: process.env.ONEPIPE_SECRET || 'mock_secret',
    mock: process.env.ONEPIPE_MOCK === 'true' || !process.env.ONEPIPE_API_KEY,
  },

  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
};