import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

import { config } from './config/config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

// Route imports
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import walletRoutes from './routes/wallet.routes';
import messageRoutes from './routes/message.routes';
import callRoutes from './routes/call.routes';

const app = express();
// Load the swagger document
const swaggerDocument = YAML.load(path.join(__dirname, '../docs/swagger.yaml'));
const swaggerOptions = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Communication API',
      version: '1.0.0',
      description: 'A comprehensive API for authentication, messaging, calling, and wallet management',
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.ts'], // Path to the API files
};

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimiting.windowMs,
  max: config.rateLimiting.maxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
}

if (config.nodeEnv !== 'production') {
  // Serve Swagger UI at /docs
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "Communication API Documentation",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'tag',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true
    }
  }));

  // Serve raw swagger JSON at /docs/json
  app.get('/docs/json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });
  // const swaggerSpec = swaggerJSDoc(swaggerOptions);

  // // Add to your app
  // app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  // app.get('/docs/json', (req, res) => {
  //   res.setHeader('Content-Type', 'application/json');
  //   res.send(swaggerSpec);
  // });
}


// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/calls', callRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Communication API',
    version: '1.0.0',
    description: 'A comprehensive communication API with wallet integration',
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout',
      },
      profile: {
        get: 'GET /api/profile',
        update: 'PUT /api/profile',
      },
      wallet: {
        create: 'POST /api/wallet/create',
        balance: 'GET /api/wallet/balance',
      },
      messages: {
        history: 'GET /api/messages/history/:userId',
        send: 'POST /api/messages/send',
      },
      calls: {
        start: 'POST /api/calls/start',
        end: 'POST /api/calls/end',
        history: 'GET /api/calls/history',
      },
    },
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;