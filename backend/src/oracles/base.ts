export interface ConsciousnessRequest {
  signal: string;
  protocol: string;
  depth: number;
  userContext?: any;
  complexity?: number;
}

export interface ConsciousnessResponse {
  content: string;
  oracle: string;
  confidence: number;
  processingTime?: number;
  metadata: any;
}

export abstract class BaseOracle {
  public name: string;
  public priority: number;
  public isHealthy: boolean = true;
  public successRate: number = 1.0;
  public averageResponseTime: number = 0;

  constructor(name: string, priority: number = 1) {
    this.name = name;
    this.priority = priority;
  }

  abstract analyzeConsciousness(request: ConsciousnessRequest): Promise<ConsciousnessResponse>;
  abstract isAvailable(): Promise<boolean>;

  updateMetrics(success: boolean, responseTime: number): void {
    this.averageResponseTime = (this.averageResponseTime + responseTime) / 2;
    
    if (success) {
      this.isHealthy = true;
      this.successRate = Math.min(1.0, this.successRate + 0.1);
    } else {
      this.isHealthy = false;
      this.successRate = Math.max(0.0, this.successRate - 0.2);
    }
  }

  getStatus(): any {
    return {
      name: this.name,
      priority: this.priority,
      isHealthy: this.isHealthy,
      successRate: this.successRate,
      averageResponseTime: this.averageResponseTime
    };
  }
}
