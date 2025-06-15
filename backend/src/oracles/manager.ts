import { BaseOracle, ConsciousnessRequest, ConsciousnessResponse } from './base';
import { AnthropicOracle } from './anthropic';
import { OpenAIOracle } from './openai';
import { logger } from '../utils/logger';
import { config } from '../config';

export class OracleManager {
  private oracles: Map<string, BaseOracle> = new Map();
  private failoverOrder: string[] = [];
  private analytics = {
    totalQueries: 0,
    successfulQueries: 0,
    failoverEvents: 0,
    averageResponseTime: 0
  };

  constructor() {
    this.initializeOracles();
  }

  private initializeOracles(): void {
    // Initialize available oracles based on API keys
    if (config.ANTHROPIC_API_KEY) {
      this.registerOracle(new AnthropicOracle({
        apiKey: config.ANTHROPIC_API_KEY,
        priority: 1
      }));
    }

    if (config.OPENAI_API_KEY) {
      this.registerOracle(new OpenAIOracle({
        apiKey: config.OPENAI_API_KEY,
        priority: 2
      }));
    }

    this.updateFailoverOrder();
    
    if (this.oracles.size === 0) {
      logger.warn('⚠️ No Oracle API keys configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variables.');
    } else {
      logger.info(`🔮 Initialized ${this.oracles.size} oracles: ${Array.from(this.oracles.keys()).join(', ')}`);
    }
  }

  private registerOracle(oracle: BaseOracle): void {
    this.oracles.set(oracle.name, oracle);
    logger.info(`✨ Registered oracle: ${oracle.name} (Priority: ${oracle.priority})`);
  }

  private updateFailoverOrder(): void {
    this.failoverOrder = Array.from(this.oracles.values())
      .sort((a, b) => {
        // Sort by priority first, then by success rate
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return b.successRate - a.successRate;
      })
      .map(oracle => oracle.name);
  }

  async analyzeConsciousness(request: ConsciousnessRequest): Promise<ConsciousnessResponse> {
    if (this.oracles.size === 0) {
      throw new Error('No oracles available. Please configure AI API keys (ANTHROPIC_API_KEY or OPENAI_API_KEY).');
    }

    this.analytics.totalQueries++;
    const startTime = Date.now();
    
    let lastError: Error | null = null;
    let attemptCount = 0;

    // Update failover order based on current health
    this.updateFailoverOrder();

    for (const oracleName of this.failoverOrder) {
      const oracle = this.oracles.get(oracleName);
      if (!oracle) continue;

      attemptCount++;

      try {
        logger.info(`🔮 Attempting analysis with ${oracleName} (attempt ${attemptCount}/${this.failoverOrder.length})`);
        
        const result = await oracle.analyzeConsciousness(request);
        
        // Success!
        this.analytics.successfulQueries++;
        this.analytics.averageResponseTime = (
          this.analytics.averageResponseTime + (Date.now() - startTime)
        ) / 2;
        
        logger.info(`✅ Analysis completed by ${oracleName} in ${result.processingTime}ms`);
        
        return result;

      } catch (error) {
        lastError = error as Error;
        this.analytics.failoverEvents++;
        
        logger.warn(`⚠️ Oracle ${oracleName} failed: ${error.message}`);
        
        // If this isn't the last Oracle, continue to next
        if (attemptCount < this.failoverOrder.length) {
          logger.info(`🔄 Failing over to next oracle...`);
          continue;
        }
      }
    }

    // All oracles failed
    const totalTime = Date.now() - startTime;
    logger.error(`❌ All ${attemptCount} oracles failed after ${totalTime}ms. Last error: ${lastError?.message}`);
    
    throw new Error(`All oracles failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  async getOracleStatus(): Promise<any> {
    const oracleStatuses = await Promise.all(
      Array.from(this.oracles.values()).map(async oracle => {
        try {
          const isAvailable = await oracle.isAvailable();
          return {
            name: oracle.name,
            healthy: isAvailable,
            priority: oracle.priority,
            successRate: oracle.successRate,
            averageResponseTime: oracle.averageResponseTime
          };
        } catch (error) {
          return {
            name: oracle.name,
            healthy: false,
            priority: oracle.priority,
            successRate: oracle.successRate,
            averageResponseTime: oracle.averageResponseTime,
            error: error.message
          };
        }
      })
    );

    return {
      totalOracles: this.oracles.size,
      availableOracles: oracleStatuses.filter(s => s.healthy).length,
      failoverOrder: this.failoverOrder,
      analytics: this.analytics,
      oracles: oracleStatuses
    };
  }

  async performHealthCheck(): Promise<Map<string, boolean>> {
    logger.info('🏥 Performing Oracle health check...');
    
    const healthResults = new Map<string, boolean>();
    
    const healthPromises = Array.from(this.oracles.values()).map(async oracle => {
      try {
        const isHealthy = await oracle.isAvailable();
        oracle.isHealthy = isHealthy;
        healthResults.set(oracle.name, isHealthy);
        return { name: oracle.name, isHealthy };
      } catch (error) {
        oracle.isHealthy = false;
        healthResults.set(oracle.name, false);
        return { name: oracle.name, isHealthy: false, error: error.message };
      }
    });

    const results = await Promise.all(healthPromises);
    
    // Update failover order after health check
    this.updateFailoverOrder();
    
    // Log health status
    results.forEach(result => {
      const status = result.isHealthy ? '✅ Healthy' : '❌ Unhealthy';
      logger.info(`🏥 Oracle Health: ${result.name} - ${status}`);
    });

    return healthResults;
  }

  // Get analytics data
  getAnalytics(): any {
    return {
      ...this.analytics,
      oracleCount: this.oracles.size,
      successRate: this.analytics.totalQueries > 0 
        ? this.analytics.successfulQueries / this.analytics.totalQueries 
        : 0,
      failoverRate: this.analytics.totalQueries > 0
        ? this.analytics.failoverEvents / this.analytics.totalQueries
        : 0
    };
  }
}

// Create global oracle manager instance
export const oracleManager = new OracleManager();
