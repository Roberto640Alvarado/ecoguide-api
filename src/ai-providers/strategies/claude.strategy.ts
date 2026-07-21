import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { fetchWithTimeout } from './fetch-with-timeout.util';
import {
  AICompletionParams,
  AICompletionResult,
  AIProviderStrategy,
} from './ai-provider.strategy';

const CLAUDE_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
// Anthropic exige max_tokens en cada request (no tiene default propio).
const DEFAULT_MAX_TOKENS = 1024;

interface ClaudeResponseBody {
  content?: { type: string; text?: string }[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
}

/**
 * Estrategia para Anthropic Claude (Messages API). Claude tampoco acepta el
 * rol "system" dentro de `messages`: se extrae y se envía en el campo
 * `system` de nivel superior, igual que Gemini con `systemInstruction`.
 */
@Injectable()
export class ClaudeStrategy implements AIProviderStrategy {
  private readonly logger = new Logger(ClaudeStrategy.name);

  async complete(params: AICompletionParams): Promise<AICompletionResult> {
    const systemText = params.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n');

    const messages = params.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      }));

    try {
      const response = await fetchWithTimeout(CLAUDE_MESSAGES_URL, {
        method: 'POST',
        headers: {
          'x-api-key': params.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: params.model,
          messages,
          ...(systemText && { system: systemText }),
          max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
          ...(params.temperature !== undefined && {
            temperature: params.temperature,
          }),
        }),
      });

      const body = (await response.json()) as ClaudeResponseBody;

      if (!response.ok) {
        this.logger.error(
          `Claude respondió ${response.status}: ${JSON.stringify(body)}`,
        );
        throw new InternalServerErrorException(
          'No se pudo obtener una respuesta de Claude.',
        );
      }

      const text =
        body.content
          ?.filter((block) => block.type === 'text')
          .map((block) => block.text ?? '')
          .join('') ?? '';

      const inputTokens = body.usage?.input_tokens;
      const outputTokens = body.usage?.output_tokens;

      return {
        content: text,
        finishReason: body.stop_reason,
        usage: {
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens:
            inputTokens !== undefined && outputTokens !== undefined
              ? inputTokens + outputTokens
              : undefined,
        },
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error(
        `Fallo al comunicarse con Claude: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        'No se pudo comunicar con Claude.',
      );
    }
  }
}
