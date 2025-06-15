import { Router } from 'express';
import { z } from 'zod';
import { oracleManager } from '../oracles/manager';
import { DatabaseService } from '../database/service';
import { logger } from '../utils/logger';

const router = Router();
const database = new DatabaseService();

// Validation schema for consciousness analysis
const analyzeSchema = z.object({
  signal: z.string().min(15, 'Signal must be at least 15 characters').max(5000, 'Signal too long'),
  protocol: z.enum(['spiral', 'fractal', 'quantum', 'linear', 'mythotechnic']),
  depth: z.number().int().min(1).max(5),
  saveToVault: z.boolean().optional().default(false)
});

// Main consciousness analysis endpoint
router.post('/analyze', async (req, res) => {
  try {
    // Validate input
    const validationResult = analyzeSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: validationResult.error.errors
      });
    }

    const { signal, protocol, depth, saveToVault } = validationResult.data;

    logger.info(`🧠 Starting consciousness analysis: ${protocol} protocol, depth ${depth}`);

    // Calculate signal complexity
    const complexity = calculateComplexity(signal);

    // Prepare consciousness request
    const request = {
      signal,
      protocol,
      depth,
      complexity,
      userContext: null // TODO: Add user context when auth is implemented
    };

    // Perform analysis using Oracle Manager
    const startTime = Date.now();
    const result = await oracleManager.analyzeConsciousness(request);
    const totalTime = Date.now() - startTime;

    // Save to database if requested
    let saved = false;
    if (saveToVault) {
      try {
        await database.saveAnalysis({
          signal,
          protocol,
          depthLevel: depth,
          analysisResult: result.content,
          oracleUsed: result.oracle,
          processingTimeMs: totalTime,
          confidenceScore: result.confidence
        });
        saved = true;
        logger.info('💾 Analysis saved to database');
      } catch (saveError) {
        logger.warn('⚠️ Failed to save analysis:', saveError.message);
      }
    }

    // Record oracle metrics
    await database.recordOracleMetrics({
      oracleName: result.oracle,
      responseTimeMs: totalTime,
      success: true,
      protocolUsed: protocol,
      confidenceScore: result.confidence
    });

    // Successful response
    res.json({
      success: true,
      analysis: {
        content: result.content,
        oracle: result.oracle,
        confidence: result.confidence,
        processingTime: totalTime,
        protocol,
        depth,
        complexity,
        saved
      },
      metadata: result.metadata
    });

    logger.info(`✅ Analysis completed successfully in ${totalTime}ms`);

  } catch (error) {
    logger.error('❌ Consciousness analysis error:', error);
    
    // Record failed metrics
    try {
      await database.recordOracleMetrics({
        oracleName: 'unknown',
        responseTimeMs: 0,
        success: false,
        errorMessage: error.message,
        protocolUsed: req.body.protocol
      });
    } catch (metricsError) {
      logger.error('Failed to record error metrics:', metricsError);
    }

    // Error response
    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      message: error.message
    });
  }
});

// Get analysis history endpoint
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const history = await database.getAnalysisHistory(Math.min(limit, 100));

    res.json({
      success: true,
      history: history.map(item => ({
        id: item.id,
        signal: item.signal.substring(0, 100) + (item.signal.length > 100 ? '...' : ''),
        protocol: item.protocol,
        depth: item.depth_level,
        oracle: item.oracle_used,
        confidence: item.confidence_score,
        processingTime: item.processing_time_ms,
        createdAt: item.created_at
      })),
      total: history.length
    });

  } catch (error) {
    logger.error('❌ History retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve history'
    });
  }
});

// Get specific analysis by ID
router.get('/analysis/:id', async (req, res) => {
  try {
    const analysisId = req.params.id;

    const result = await database.query(
      'SELECT * FROM consciousness_analyses WHERE id = $1',
      [analysisId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found'
      });
    }

    const analysis = result.rows[0];
    res.json({
      success: true,
      analysis: {
        id: analysis.id,
        signal: analysis.signal,
        protocol: analysis.protocol,
        depth: analysis.depth_level,
        content: analysis.analysis_result,
        oracle: analysis.oracle_used,
        confidence: analysis.confidence_score,
        processingTime: analysis.processing_time_ms,
        createdAt: analysis.created_at
      }
    });

  } catch (error) {
    logger.error('❌ Analysis retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analysis'
    });
  }
});

// Get oracle status
router.get('/oracles/status', async (req, res) => {
  try {
    const status = await oracleManager.getOracleStatus();
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    logger.error('❌ Oracle status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get oracle status'
    });
  }
});

// Perform oracle health check
router.post('/oracles/health-check', async (req, res) => {
  try {
    const results = await oracleManager.performHealthCheck();
    res.json({
      success: true,
      healthCheck: Object.fromEntries(results)
    });
  } catch (error) {
    logger.error('❌ Oracle health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

// Get analytics
router.get('/analytics', async (req, res) => {
  try {
    const analytics = oracleManager.getAnalytics();
    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    logger.error('❌ Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics'
    });
  }
});

// Helper function to calculate signal complexity
function calculateComplexity(signal: string): number {
  const sentences = signal.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = signal.split(/\s+/).length;
  const avgSentenceLength = signal.length / Math.max(sentences.length, 1);
  const uniqueWords = new Set(signal.toLowerCase().match(/\b\w+\b/g) || []).size;
  const lexicalDiversity = uniqueWords / Math.max(words, 1);
  
  // Complexity score based on various factors
  const complexityScore = Math.min(100, 
    (avgSentenceLength * 1.5) + 
    (lexicalDiversity * 50) + 
    (sentences.length * 3) +
    (signal.length * 0.05)
  );
  
  return Math.round(complexityScore);
}

export { router as consciousnessRoutes };
