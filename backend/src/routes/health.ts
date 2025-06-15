import { Router } from 'express';
import { DatabaseService } from '../database/service';

const router = Router();
const database = new DatabaseService();

// Basic health check
router.get('/', async (req, res) => {
  try {
    // Check database connection
    await database.query('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'consciousness-server',
      version: '1.0.0',
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'consciousness-server',
      version: '1.0.0',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Readiness check
router.get('/ready', async (req, res) => {
  try {
    // More thorough checks
    await database.query('SELECT NOW()');
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      service: 'consciousness-server',
      checks: {
        database: 'ok',
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

export { router as healthRoutes };
