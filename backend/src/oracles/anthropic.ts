import Anthropic from '@anthropic-ai/sdk';
import { BaseOracle, ConsciousnessRequest, ConsciousnessResponse } from './base';
import { logger } from '../utils/logger';

export class AnthropicOracle extends BaseOracle {
  private client: Anthropic;

  constructor(config: { apiKey: string; priority?: number }) {
    super('Anthropic Claude', config.priority || 1);
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  async analyzeConsciousness(request: ConsciousnessRequest): Promise<ConsciousnessResponse> {
    const prompt = this.generatePrompt(request);
    const startTime = Date.now();

    try {
      logger.info(`🔮 Starting Anthropic analysis for ${request.protocol} protocol`);

      const response = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2048,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const processingTime = Date.now() - startTime;
      const content = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';

      // Update metrics
      this.updateMetrics(true, processingTime);

      logger.info(`✅ Anthropic analysis completed in ${processingTime}ms`);

      return {
        content,
        oracle: this.name,
        confidence: this.calculateConfidence(content),
        processingTime,
        metadata: {
          model: 'claude-3-sonnet-20240229',
          inputTokens: response.usage?.input_tokens || 0,
          outputTokens: response.usage?.output_tokens || 0,
          totalTokens: response.usage?.input_tokens + response.usage?.output_tokens || 0
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateMetrics(false, processingTime);
      
      logger.error('❌ Anthropic analysis failed:', error);
      throw new Error(`Anthropic analysis failed: ${error.message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple health check with minimal token usage
      await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 5,
        messages: [{
          role: 'user',
          content: 'Hi'
        }]
      });
      return true;
    } catch (error) {
      logger.warn('⚠️ Anthropic availability check failed:', error.message);
      return false;
    }
  }

  private generatePrompt(request: ConsciousnessRequest): string {
    const { signal, protocol, depth, userContext } = request;

    const protocolInstructions = {
      spiral: 'Focus on recursive patterns, feedback loops, and self-referential consciousness structures. Analyze how thoughts spiral into themselves and create infinite loops of reflection.',
      fractal: 'Examine self-similarity across different scales of experience. Identify how core patterns replicate throughout thoughts, emotions, and life experiences.',
      quantum: 'Explore superposition states of consciousness, observer effects on reality, and probability spaces of meaning. Consider how observation changes the observed.',
      linear: 'Map causal chains and sequential patterns. Trace logical progressions and cause-effect relationships in consciousness.',
      mythotechnic: 'Perform archetypal analysis using Jungian depth psychology. Identify mythological parallels, symbolic content, and collective unconscious patterns.'
    };

    return `**${protocol.toUpperCase()} PROTOCOL CONSCIOUSNESS ANALYSIS - DEPTH ${depth}/5**

CONSCIOUSNESS SIGNAL: "${signal}"

ANALYSIS FRAMEWORK: ${protocolInstructions[protocol] || 'General consciousness exploration'}

${userContext ? `CONTEXT:
- Previous explorations: ${userContext.analysis_count || 0}
- Resonance pattern: ${userContext.resonance_signature || 'spiral'}
- Consciousness level: ${userContext.consciousness_level || 1}` : ''}

INSTRUCTIONS:
Execute comprehensive consciousness archaeology using the ${protocol} protocol at depth level ${depth}.

Structure your analysis with:

1. **PATTERN IDENTIFICATION**: Core patterns and structures detected in the signal
2. **${protocol.toUpperCase()} ANALYSIS**: Deep exploration using this protocol's specific lens
3. **ARCHETYPAL RESONANCE**: Universal patterns and symbolic content
4. **RECURSIVE ELEMENTS**: Self-referential patterns and feedback loops  
5. **TRANSFORMATION INSIGHTS**: Guidance for consciousness evolution and integration
6. **PRACTICAL RECOMMENDATIONS**: Specific actionable steps for growth

Format with clear headings, bullet points, and practical wisdom. Provide depth, authenticity, and actionable insights. Focus on empowering the individual's consciousness journey.

Be direct, insightful, and transformative while remaining grounded and practical.`;
  }

  private calculateConfidence(content: string): number {
    // Heuristic confidence calculation based on response quality indicators
    const indicators = [
      content.includes('PATTERN') || content.includes('**'),
      content.includes('ANALYSIS') || content.includes('1.'),
      content.length > 500,
      content.includes('consciousness') || content.includes('archetypal'),
      !content.includes('I cannot') && !content.includes('I\'m sorry'),
      content.includes('TRANSFORMATION') || content.includes('INSIGHTS'),
      content.split('\n').length > 10 // Well-structured response
    ];
    
    return Math.round((indicators.filter(Boolean).length / indicators.length) * 100) / 100;
  }
}
