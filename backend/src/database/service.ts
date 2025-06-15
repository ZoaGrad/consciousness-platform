import { Pool, PoolClient } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

export class DatabaseService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      logger.info('🗄️  Database connected successfully at', result.rows[0].now);
      
      // Create tables if they don't exist
      await this.initializeTables();
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
    logger.info('🔌 Database disconnected');
  }

  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Query error', { text, error });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  // Initialize basic tables for consciousness analysis
  private async initializeTables(): Promise<void> {
    try {
      // Simple consciousness analyses table
      await this.query(`
        CREATE TABLE IF NOT EXISTS consciousness_analyses (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          signal TEXT NOT NULL,
          protocol VARCHAR(50) NOT NULL,
          depth_level INTEGER NOT NULL,
          analysis_result TEXT NOT NULL,
          oracle_used VARCHAR(100) NOT NULL,
          processing_time_ms INTEGER,
          confidence_score DECIMAL(3,2),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Oracle metrics table
      await this.query(`
        CREATE TABLE IF NOT EXISTS oracle_metrics (
          id SERIAL PRIMARY KEY,
          oracle_name VARCHAR(100) NOT NULL,
          response_time_ms INTEGER NOT NULL,
          success BOOLEAN NOT NULL,
          error_message TEXT,
          protocol_used VARCHAR(50),
          confidence_score DECIMAL(3,2),
          query_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      logger.info('✅ Database tables initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize tables:', error);
      throw error;
    }
  }

  // Consciousness analysis methods
  async saveAnalysis(data: any): Promise<any> {
    const {
      signal, protocol, depthLevel, analysisResult, 
      oracleUsed, processingTimeMs, confidenceScore
    } = data;

    const result = await this.query(`
      INSERT INTO consciousness_analyses (
        signal, protocol, depth_level, analysis_result,
        oracle_used, processing_time_ms, confidence_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      signal, protocol, depthLevel, analysisResult,
      oracleUsed, processingTimeMs, confidenceScore
    ]);

    return result.rows[0];
  }

  async getAnalysisHistory(limit: number = 20): Promise<any[]> {
    const result = await this.query(`
      SELECT id, signal, protocol, depth_level, analysis_result, 
             confidence_score, created_at, processing_time_ms
      FROM consciousness_analyses 
      ORDER BY created_at DESC 
      LIMIT $1
    `, [limit]);

    return result.rows;
  }

  // Oracle metrics
  async recordOracleMetrics(data: any): Promise<void> {
    const {
      oracleName, responseTimeMs, success, errorMessage, 
      protocolUsed, confidenceScore
    } = data;

    await this.query(`
      INSERT INTO oracle_metrics (
        oracle_name, response_time_ms, success, error_message,
        protocol_used, confidence_score
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      oracleName, responseTimeMs, success, errorMessage,
      protocolUsed, confidenceScore
    ]);
  }
}
