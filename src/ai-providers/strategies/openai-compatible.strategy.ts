import { InternalServerErrorException, Logger } from '@nestjs/common';
import { fetchWithTimeout } from './fetch-with-timeout.util';
import {
  AICompletionParams,
  AICompletionResult,
  AIProviderStrategy,
} from './ai-provider.strategy';

interface OpenAICompatibleResponseBody {
  choices?: {
    message?: { content?: string };
    finish_reason?: string;
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string };
}

/**
 * Base compartida para los proveedores que exponen una API compatible con
 * el formato "chat completions" de OpenAI: el propio OpenAI, Mistral y
 * DeepSeek. Los tres difieren únicamente en la baseUrl — el request y la
 * respuesta son idénticos — así que esta clase concentra esa lógica común
 * (DRY) y cada vendor solo aporta su URL vía un subclase concreta
 * (OpenAIStrategy, MistralStrategy, DeepSeekStrategy).
 *
 * No se registra como @Injectable por sí misma porque nunca se instancia
 * directamente (es abstracta); son las subclases las que NestJS instancia e
 * inyecta, cumpliendo con "usar siempre Dependency Injection, evitar
 * instancias manuales".
 */
export abstract class OpenAICompatibleStrategy implements AIProviderStrategy {
  private readonly logger = new Logger(this.constructor.name);

  protected constructor(private readonly baseUrl: string) {}

  async complete(params: AICompletionParams): Promise<AICompletionResult> {
    try {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${params.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: params.model,
            messages: params.messages,
            ...(params.temperature !== undefined && {
              temperature: params.temperature,
            }),
            ...(params.maxTokens !== undefined && {
              max_tokens: params.maxTokens,
            }),
          }),
        },
      );

      const body = (await response.json()) as OpenAICompatibleResponseBody;

      if (!response.ok) {
        this.logger.error(
          `${this.baseUrl} respondió ${response.status}: ${JSON.stringify(body)}`,
        );
        throw new InternalServerErrorException(
          'No se pudo obtener una respuesta del proveedor de IA.',
        );
      }

      const choice = body.choices?.[0];

      return {
        content: choice?.message?.content ?? '',
        finishReason: choice?.finish_reason,
        usage: {
          promptTokens: body.usage?.prompt_tokens,
          completionTokens: body.usage?.completion_tokens,
          totalTokens: body.usage?.total_tokens,
        },
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error(
        `Fallo al comunicarse con ${this.baseUrl}: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        'No se pudo comunicar con el proveedor de IA.',
      );
    }
  }
}
