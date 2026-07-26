import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TranslationLanguage } from '../enums/translation-language.enum';

const DEEPL_FREE_BASE_URL = 'https://api-free.deepl.com/v2/translate';
const DEEPL_PRO_BASE_URL = 'https://api.deepl.com/v2/translate';
const DEFAULT_TIMEOUT_MS = 15_000;

// DeepL exige variante regional como target para inglés ("EN" alone ya no
// se acepta como destino, solo como origen); español no tiene variantes.
const DEEPL_TARGET_LANG: Record<TranslationLanguage, string> = {
  [TranslationLanguage.EN]: 'EN-US',
  [TranslationLanguage.ES]: 'ES',
};

interface DeepLResponseBody {
  translations?: { text: string; detected_source_language?: string }[];
  message?: string;
}

/**
 * Wrapper sobre la API REST de DeepL (traducción de texto plano). Las keys
 * gratuitas de DeepL terminan en ":fx" y usan un host distinto al de las
 * keys de pago — se detecta automáticamente para no requerir configuración
 * extra.
 */
@Injectable()
export class DeepLTranslationService {
  private readonly logger = new Logger(DeepLTranslationService.name);
  private readonly apiKey?: string;
  private readonly baseUrl: string;

  // No se usa getOrThrow: este servicio se instancia al arrancar Nest (import
  // eager de TranslationModule en AppModule), así que si la key todavía no
  // está configurada no debe tumbar todo el backend — solo falla la llamada
  // puntual a /translation/batch con un mensaje claro (ver más abajo).
  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DEEPL_API_KEY');
    this.baseUrl = this.apiKey?.trim().endsWith(':fx')
      ? DEEPL_FREE_BASE_URL
      : DEEPL_PRO_BASE_URL;
  }

  /**
   * Traduce una lista de textos en una sola llamada (DeepL acepta múltiples
   * `text` en el mismo request). Devuelve las traducciones en el mismo
   * orden que `texts`.
   */
  async translateBatch(
    texts: string[],
    targetLanguage: TranslationLanguage,
  ): Promise<string[]> {
    if (texts.length === 0) return [];

    if (!this.apiKey) {
      this.logger.error(
        'DEEPL_API_KEY no está configurada — no se puede traducir.',
      );
      throw new InternalServerErrorException(
        'El servicio de traducción no está configurado todavía.',
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: texts,
          target_lang: DEEPL_TARGET_LANG[targetLanguage],
          // Algunos textos son HTML (ej. descripción de un área, escrita con
          // el editor enriquecido) — con tag_handling:'html' DeepL preserva
          // las etiquetas y solo traduce el contenido de texto. No afecta a
          // los textos planos del mismo batch (títulos, mensajes, etc.).
          tag_handling: 'html',
        }),
        signal: controller.signal,
      });

      const body = (await response.json()) as DeepLResponseBody;

      if (!response.ok) {
        this.logger.error(
          `DeepL respondió ${response.status}: ${JSON.stringify(body)}`,
        );
        throw new InternalServerErrorException(
          'No se pudo traducir el texto en este momento.',
        );
      }

      return (body.translations ?? []).map((item) => item.text);
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error(
        `Fallo al comunicarse con DeepL: ${(error as Error).message}`,
      );
      throw new InternalServerErrorException(
        'No se pudo comunicar con el servicio de traducción.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
