import OpenAI from 'openai';
import { BaseOracle, ConsciousnessRequest, ConsciousnessResponse } from './base';
import { logger } from '../utils/logger';

export class OpenAIOracle extends BaseOracle {
  private client: OpenAI;

  constructor(config: { apiKey: string; priority?: number }) {
    super('OpenAI GPT', config.priority || 2);
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  async analyzeConsciousness(request: ConsciousnessRequest): Promise<ConsciousnessResponse> {
    const prompt = this.generatePrompt(request);
    const startTime = Date.now();

    try {
      logger.info(`🔮 Starting OpenAI analysis for ${request.protocol} protocol`);

      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a consciousness analysis expert specializing in archetypal psychology, pattern recognition, and transformational insights. Provide deep, practical, and empowering analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2048,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const processingTime = Date.now() - startTime;
      const content = response.choices[0]?.message?.content || '';

      // Update metrics
      this.updateMetrics(true, processingTime);

      logger.info(`✅ OpenAI analysis completed in ${processingTime}ms`);

      return {
        content,
        oracle: this.name,
        confidence: this.calculateConfidence(content),
        processingTime,
        metadata: {
          model: 'gpt-4',
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
          finishReason: response.choices[0]?.finish_reason
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateMetrics(false, processingTime);
      
      logger.error('❌ OpenAI analysis failed:', error);
      throw new Error(`OpenAI analysis failed: ${error.message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple health check
      await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5
      });
      return true;
    } catch (error) {
      logger.warn('⚠️ OpenAI availability check failed:', error.message);
      return false;
    }
  }

  private generatePrompt(request: ConsciousnessRequest): string {
    const { signal, protocol, depth, userContext } = request;

    const protocolFocus = {
      spiral: 'recursive patterns, self-referential loops, and infinite reflection cycles',
      fractal: 'self-similarity across scales, pattern replication, and dimensional analysis',
      quantum: 'superposition states, observer effects, and probability consciousness',
      linear: 'causal chains, sequential processing, and logical progression mapping',
      mythotechnic: 'archetypal identification, mythological parallels, and symbolic interpretation'
    };

    return `**CONSCIOUSNESS ANALYSIS REQUEST**

Signal: "${signal}"
Protocol: ${protocol.toUpperCase()}
Depth: ${depth}/5
Focus: ${protocolFocus[protocol]}

${userContext ? `User Context: ${userContext.analysis_count || 0} previous analyses, ${userContext.resonance_signature || 'spiral'} resonance` : ''}

Perform deep consciousness analysis focusing on ${protocolFocus[protocol]}. 

Provide a structured response with:

1. **CORE PATTERN ANALYSIS** - Identify the fundamental patterns in this consciousness signal
2. **${protocol.toUpperCase()} LENS** - Analyze through the specific ${protocol} protocol perspective  
3. **ARCHETYPAL MAPPING** - Connect to universal human patterns and symbols
4. **TRANSFORMATION PATHWAYS** - Specific guidance for consciousness evolution
5. **INTEGRATION PRACTICES** - Practical steps for applying these insights

Make the analysis depth level ${depth}/5 - where 1 is surface level and 5 is profound collective unconscious depth.

Be insightful, practical, and empowering. Focus on actionable wisdom for personal growth.`;
  }

  private calculateConfidence(content: string): number {
    // Quality indicators for OpenAI responses
    const indicators = [
      content.includes('ANALYSIS') || content.includes('PATTERN'),
      content.includes('1.') || content.includes('**'),
      content.length > 400,
      content.includes('consciousness') || content.includes('archetypal'),
      !content.includes('I cannot provide') && !content.includes('I\'m unable'),
      content.includes('TRANSFORMATION') || content.includes('practices'),
      content.split('**').length > 4 // Well-structured with headers
    ];
    
    return Math.round((indicators.filter(Boolean).length / indicators.length) * 100) / 100;
  }
}
