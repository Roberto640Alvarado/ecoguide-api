import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AIProvidersRepository } from '../repositories/ai-providers.repository';
import { ApiKeyEncryptionService } from './api-key-encryption.service';
import { AIProviderStrategyFactory } from '../strategies/ai-provider-strategy.factory';
import {
  AIChatMessage,
  AICompletionResult,
} from '../strategies/ai-provider.strategy';

export interface AICompletionRequest {
  /** Id del AIProvider configurado por el docente (SpeakingPractice.providerId / ChatbotConfig.providerId). */
  providerId: string;
  /** Identificador real del modelo (SpeakingPractice.model / ChatbotConfig.model); debe existir y estar activo en el catálogo del proveedor. */
  model: string;
  messages: AIChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

/**
 * Punto de entrada único para que otros módulos (Chatbot, SpeakingPractices)
 * generen respuestas de IA sin conocer nada sobre proveedores, cifrado de
 * API keys, o el formato de request específico de cada vendor.
 *
 * El llamador solo pasa el providerId + model que el docente configuró en
 * la base de datos (nunca hardcodeados, ver CLAUDE.md sección "IA") y este
 * servicio hace el resto: busca el proveedor, valida que el modelo exista y
 * esté activo, descifra el apiKey, resuelve la AIProviderStrategy correcta
 * (Strategy pattern, ver AIProviderStrategyFactory) y le delega la llamada.
 */
@Injectable()
export class AICompletionService {
  constructor(
    private readonly aiProvidersRepository: AIProvidersRepository,
    private readonly apiKeyEncryptionService: ApiKeyEncryptionService,
    private readonly strategyFactory: AIProviderStrategyFactory,
  ) {}

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const provider = await this.aiProvidersRepository.findById(
      request.providerId,
    );

    if (!provider || !provider.isActive) {
      throw new NotFoundException('Proveedor de IA no encontrado o inactivo.');
    }

    const modelConfig = provider.models.find(
      (candidate) => candidate.model === request.model,
    );

    if (!modelConfig || !modelConfig.isActive) {
      throw new BadRequestException(
        'El modelo solicitado no está configurado o está inactivo para este proveedor.',
      );
    }

    const apiKey = this.apiKeyEncryptionService.decrypt(
      provider.apiKeyEncrypted,
    );
    const strategy = this.strategyFactory.getStrategy(provider.providerType);

    return strategy.complete({
      apiKey,
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    });
  }
}
