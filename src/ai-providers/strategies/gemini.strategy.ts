import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { fetchWithTimeout } from './fetch-with-timeout.util';
import {
  AIChatMessage,
  AICompletionParams,
  AICompletionResult,
  AIProviderStrategy,
} from './ai-provider.strategy';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MAX_OUTPUT_TOKENS = 2048;

interface GeminiContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GeminiResponseBody {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { message?: string };
}

/**
 * Estrategia para Google Gemini (Generative Language API,
 * `models/{model}:generateContent`). A diferencia de las demás APIs, Gemini
 * no tiene un rol "system" dentro de `contents`: los mensajes de sistema se
 * extraen y se envían aparte en `systemInstruction`, y el rol "assistant" se
 * traduce a "model" (el nombre que usa Gemini para sus propios turnos).
 */
@Injectable()
export class GeminiStrategy implements AIProviderStrategy {
  private readonly logger = new Logger(GeminiStrategy.name);

  async complete(params: AICompletionParams): Promise<AICompletionResult> {
    const systemText = params.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n');

    const contents: GeminiContent[] = params.messages
      .filter((message) => message.role !== 'system')
      .map((message) => this.toGeminiContent(message));

    const url = `${GEMINI_BASE_URL}/models/${encodeURIComponent(
      params.model,
    )}:generateContent?key=${encodeURIComponent(params.apiKey)}`;

    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          ...(systemText && {
            systemInstruction: { parts: [{ text: systemText }] },
          }),
          generationConfig: {
            ...(params.temperature !== undefined && {
              temperature: params.temperature,
            }),
            maxOutputTokens: params.maxTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
          },
        }),
      });

      const body = (await response.json()) as GeminiResponseBody;

      if (!response.ok) {
        this.logger.error(
          `Gemini respondió ${response.status}: ${JSON.stringify(body)}`,
        );
        throw new InternalServerErrorException(
          'No se pudo obtener una respuesta de Gemini.',
        );
      }

      const candidate = body.candidates?.[0];
      const text =
        candidate?.content?.parts?.map((part) => part.text ?? '').join('') ??
        '';

      return {
        content: text,
        finishReason: candidate?.finishReason,
        usage: {
          promptTokens: body.usageMetadata?.promptTokenCount,
          completionTokens: body.usageMetadata?.candidatesTokenCount,
          totalTokens: body.usageMetadata?.totalTokenCount,
        },
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error(
        `Fallo al comunicarse con Gemini: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        'No se pudo comunicar con Gemini.',
      );
    }
  }

  private toGeminiContent(message: AIChatMessage): GeminiContent {
    return {
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    };
  }
}
