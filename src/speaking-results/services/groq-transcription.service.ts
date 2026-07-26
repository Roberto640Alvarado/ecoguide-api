import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AIProviderType } from '@prisma/client';
import { AIProvidersService } from '../../ai-providers/services/ai-providers.service';
import { fetchWithTimeout } from '../../ai-providers/strategies/fetch-with-timeout.util';

const GROQ_TRANSCRIPTION_URL =
  'https://api.groq.com/openai/v1/audio/transcriptions';
const TRANSCRIPTION_MODEL = 'whisper-large-v3-turbo';

interface GroqTranscriptionResponseBody {
  text?: string;
  error?: { message?: string };
}

/**
 * Transcribe el audio de un turno de la llamada de speaking practice
 * (speech-to-text) vía el endpoint de Whisper de Groq, compatible con el
 * formato de OpenAI (`/audio/transcriptions`).
 *
 * Siempre usa la API key del primer AIProvider de tipo GROQ activo,
 * independientemente de cuál proveedor haya elegido el docente en
 * SpeakingPractice.providerId para generar las respuestas conversacionales
 * (esas sí pueden ser Gemini, Mistral, etc. — la transcripción es una
 * integración aparte, no pasa por AICompletionService porque su contrato es
 * de solo texto, ver AIProviderStrategy).
 */
@Injectable()
export class GroqTranscriptionService {
  private readonly logger = new Logger(GroqTranscriptionService.name);

  constructor(private readonly aiProvidersService: AIProvidersService) {}

  async transcribe(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<string> {
    const apiKey = await this.aiProvidersService.getActiveApiKeyByType(
      AIProviderType.GROQ,
    );

    const formData = new FormData();
    formData.append(
      'file',
      new Blob([new Uint8Array(buffer)], { type: mimeType }),
      filename || 'audio.webm',
    );
    formData.append('model', TRANSCRIPTION_MODEL);
    formData.append('language', 'en');
    formData.append('response_format', 'json');

    try {
      const response = await fetchWithTimeout(GROQ_TRANSCRIPTION_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      });

      const body = (await response.json()) as GroqTranscriptionResponseBody;

      if (!response.ok) {
        this.logger.error(
          `Groq (Whisper) respondió ${response.status}: ${JSON.stringify(body)}`,
        );
        throw new InternalServerErrorException(
          'No se pudo transcribir el audio.',
        );
      }

      return (body.text ?? '').trim();
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error(
        `Fallo al comunicarse con Groq (Whisper): ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        'No se pudo comunicar con el servicio de transcripción.',
      );
    }
  }
}
