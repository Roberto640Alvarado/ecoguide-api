import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AIProviderType } from '@prisma/client';
import { AIProviderStrategy } from './ai-provider.strategy';
import { GeminiStrategy } from './gemini.strategy';
import { ClaudeStrategy } from './claude.strategy';
import { OpenAIStrategy } from './openai.strategy';
import { MistralStrategy } from './mistral.strategy';
import { DeepSeekStrategy } from './deepseek.strategy';

/**
 * Resuelve la AIProviderStrategy correcta según AIProvider.providerType.
 * Punto único de extensión del patrón Strategy: soportar un vendor nuevo
 * (ej. Cohere) solo requiere una clase que implemente AIProviderStrategy,
 * inyectarla aquí y sumar una entrada al enum AIProviderType — ningún otro
 * módulo (AICompletionService, Chatbot, SpeakingPractices) necesita cambiar.
 */
@Injectable()
export class AIProviderStrategyFactory {
  private readonly strategies: Record<AIProviderType, AIProviderStrategy>;

  constructor(
    geminiStrategy: GeminiStrategy,
    claudeStrategy: ClaudeStrategy,
    openAIStrategy: OpenAIStrategy,
    mistralStrategy: MistralStrategy,
    deepSeekStrategy: DeepSeekStrategy,
  ) {
    this.strategies = {
      [AIProviderType.GEMINI]: geminiStrategy,
      [AIProviderType.CLAUDE]: claudeStrategy,
      [AIProviderType.OPENAI]: openAIStrategy,
      [AIProviderType.MISTRAL]: mistralStrategy,
      [AIProviderType.DEEPSEEK]: deepSeekStrategy,
    };
  }

  getStrategy(providerType: AIProviderType): AIProviderStrategy {
    const strategy = this.strategies[providerType];

    if (!strategy) {
      throw new InternalServerErrorException(
        `No hay una estrategia de IA implementada para "${providerType}".`,
      );
    }

    return strategy;
  }
}
