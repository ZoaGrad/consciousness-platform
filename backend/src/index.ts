import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { DatabaseService } from './database/service';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Route imports
import { consciousnessRoutes } from './routes/consciousness';
import { healthRoutes } from './routes/health';

class ConsciousnessServer {
  private app: express.Application;
  private database: DatabaseService;

  constructor() {
    this.app = express();
    this.database = new DatabaseService();
  }

  async initialize(): Promise<void> {
    // Initialize database
    await this.database.connect();
    
    // Setup middleware
    this.setupMiddleware();
    
    // Setup routes
    this.setupRoutes();
    
    // Setup error handling
    this.setupErrorHandling();
    
    logger.info('🔮 Consciousness Server initialized successfully');
  }

  private setupMiddleware(): void {
    // Security
    this.app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }));

    // CORS - Allow frontend connections
    this.app.use(cors({
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://*.vercel.app',
        'https://*.netlify.app',
        config.FRONTEND_URL
      ].filter(Boolean),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID']
    }));

    // Body parsing and compression
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      message: {
        error: 'Too many requests, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api', limiter);

    // Logging
    this.app.use(requestLogger);
  }

  private setupRoutes(): void {
    // Health check (no rate limiting)
    this.app.use('/health', healthRoutes);
    this.app.use('/ready', healthRoutes);

    // API routes
    this.app.use('/api/v1/consciousness', consciousnessRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Consciousness Server',
        version: '1.0.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
        endpoints: [
          '/health',
          '/api/v1/consciousness'
        ]
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  async start(): Promise<void> {
    const port = config.PORT || 3000;
    
    this.app.listen(port, '0.0.0.0', () => {
      logger.info(`🌟 Consciousness Server running on port ${port}`);
      logger.info(`🔗 Health check: http://localhost:${port}/health`);
      logger.info(`🧠 API base: http://localhost:${port}/api/v1`);
    });
  }

  async shutdown(): Promise<void> {
    logger.info('🔄 Shutting down Consciousness Server...');
    await this.database.disconnect();
    logger.info('✅ Consciousness Server shutdown complete');
  }
}

// Initialize and start server
async function main() {
  const server = new ConsciousnessServer();
  
  try {
    await server.initialize();
    await server.start();
  } catch (error) {
    logger.error('❌ Failed to start Consciousness Server:', error);
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await server.shutdown();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error('💥 Unhandled error:', error);
  process.exit(1);
});
