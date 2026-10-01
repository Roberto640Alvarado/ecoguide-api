import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AIProviderType } from '@prisma/client';
import { AIProvidersService } from '../../ai-providers/services/ai-providers.service';
import { fetchWithTimeout } from '../../ai-providers/strategies/fetch-with-timeout.util';

interface TranscriptionVendor {
  /** Endpoint `/audio/transcriptions` (contrato multipart de OpenAI). */
  url: string;
  /** Modelo de transcripción a usar en ese vendor. */
  model: string;
  /** Nombre legible, solo para los logs. */
  label: string;
}

/**
 * Vendors que exponen el endpoint `/audio/transcriptions` de OpenAI, con el
 * mismo contrato multipart. Agregar otro compatible es sumar una entrada
 * acá y nada más.
 */
const TRANSCRIPTION_VENDORS = {
  [AIProviderType.GROQ]: {
    url: 'https://api.groq.com/openai/v1/audio/transcriptions',
    model: 'whisper-large-v3-turbo',
    label: 'Groq (Whisper)',
  },
  [AIProviderType.OPENAI]: {
    url: 'https://api.openai.com/v1/audio/transcriptions',
    model: 'whisper-1',
    label: 'OpenAI (Whisper)',
  },
} as const satisfies Record<string, TranscriptionVendor>;

type TranscriptionProviderType = keyof typeof TRANSCRIPTION_VENDORS;

/**
 * Orden de preferencia: se usa el primero que tenga un AIProvider activo.
 * Groq va primero por costo y velocidad, pero si el docente lo desactiva la
 * práctica sigue funcionando con OpenAI — antes la transcripción estaba
 * atada a Groq y desactivar ese proveedor rompía toda la práctica de
 * speaking, incluso habiendo configurado otro proveedor en la práctica.
 */
const TRANSCRIPTION_PREFERENCE: readonly TranscriptionProviderType[] = [
  AIProviderType.GROQ,
  AIProviderType.OPENAI,
];

interface TranscriptionResponseBody {
  text?: string;
  error?: { message?: string };
}

/**
 * Transcribe el audio de un turno de la llamada de speaking practice
 * (speech-to-text) contra el endpoint `/audio/transcriptions` del primer
 * vendor compatible que esté activo (ver TRANSCRIPTION_PREFERENCE).
 *
 * Es una integración aparte de AICompletionService: el contrato de
 * AIProviderStrategy es de solo texto, y acá se sube un archivo de audio.
 * Por eso tampoco depende de `SpeakingPractice.providerId` — ese define
 * quién GENERA las respuestas conversacionales (puede ser Gemini, Claude,
 * Mistral…), mientras que la transcripción necesita un vendor que soporte
 * audio.
 */
@Injectable()
export class AudioTranscriptionService {
  private readonly logger = new Logger(AudioTranscriptionService.name);

  constructor(private readonly aiProvidersService: AIProvidersService) {}

  async transcribe(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<string> {
    const resolved = await this.aiProvidersService.findActiveApiKeyByTypes(
      TRANSCRIPTION_PREFERENCE,
    );

    if (!resolved) {
      throw new NotFoundException(
        'La práctica de speaking necesita un proveedor de IA activo que soporte transcripción de audio (Groq u OpenAI). Activa uno en Proveedores de IA.',
      );
    }

    const vendor = TRANSCRIPTION_VENDORS[resolved.providerType];

    const formData = new FormData();
    formData.append(
      'file',
      new Blob([new Uint8Array(buffer)], { type: mimeType }),
      filename || 'audio.webm',
    );
    formData.append('model', vendor.model);
    formData.append('language', 'en');
    formData.append('response_format', 'json');

    try {
      const response = await fetchWithTimeout(vendor.url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${resolved.apiKey}` },
        body: formData,
      });

      const body = (await response.json()) as TranscriptionResponseBody;

      if (!response.ok) {
        this.logger.error(
          `${vendor.label} respondió ${response.status}: ${JSON.stringify(body)}`,
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
        `Fallo al comunicarse con ${vendor.label}: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        'No se pudo comunicar con el servicio de transcripción.',
      );
    }
  }
}
