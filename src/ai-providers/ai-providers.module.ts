import { Module } from '@nestjs/common';
import { AIProvidersService } from './services/ai-providers.service';
import { ApiKeyEncryptionService } from './services/api-key-encryption.service';
import { AICompletionService } from './services/ai-completion.service';
import { AIProvidersRepository } from './repositories/ai-providers.repository';
import { AIProvidersController } from './controllers/ai-providers.controller';
import { AIProviderStrategyFactory } from './strategies/ai-provider-strategy.factory';
import { GeminiStrategy } from './strategies/gemini.strategy';
import { ClaudeStrategy } from './strategies/claude.strategy';
import { OpenAIStrategy } from './strategies/openai.strategy';
import { MistralStrategy } from './strategies/mistral.strategy';
import { DeepSeekStrategy } from './strategies/deepseek.strategy';
import { GroqStrategy } from './strategies/groq.strategy';

@Module({
  controllers: [AIProvidersController],
  providers: [
    AIProvidersService,
    ApiKeyEncryptionService,
    AIProvidersRepository,
    AICompletionService,
    AIProviderStrategyFactory,
    GeminiStrategy,
    ClaudeStrategy,
    OpenAIStrategy,
    MistralStrategy,
    DeepSeekStrategy,
    GroqStrategy,
  ],
  // AICompletionService es lo que importarán ChatbotModule y
  // SpeakingPracticesModule cuando se construyan (ver CLAUDE.md, sección
  // "Pendientes en la API" del frontend): es el único punto de entrada para
  // generar respuestas de IA, sin exponer estrategias ni cifrado hacia afuera.
  exports: [AIProvidersService, AICompletionService],
})
export class AIProvidersModule {}
