import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { TranslationRepository } from '../repositories/translation.repository';
import { DeepLTranslationService } from './deepl-translation.service';
import { TranslationLanguage } from '../enums/translation-language.enum';

/**
 * Traduce un lote de textos, cacheando cada resultado (colección
 * translation_cache) para no volver a llamar a DeepL con el mismo texto.
 * Usado para traducir contenido dinámico (escrito por el docente o generado
 * por IA) al idioma que el estudiante/docente tenga seleccionado en el botón
 * de idioma — el texto estático de la UI ya está traducido manualmente en el
 * frontend, esto es solo para lo que viene de la base de datos.
 */
@Injectable()
export class TranslationService {
  constructor(
    private readonly translationRepository: TranslationRepository,
    private readonly deepLTranslationService: DeepLTranslationService,
  ) {}

  async translateBatch(
    texts: string[],
    targetLanguage: TranslationLanguage,
  ): Promise<string[]> {
    // Se preserva el índice original: los strings vacíos/solo-espacios se
    // devuelven tal cual (no hay nada que traducir ni que cachear).
    const hashByIndex = new Map<number, string>();
    texts.forEach((text, index) => {
      if (text.trim().length > 0) {
        hashByIndex.set(index, this.hash(text));
      }
    });

    const uniqueHashes = [...new Set(hashByIndex.values())];
    const cached =
      uniqueHashes.length > 0
        ? await this.translationRepository.findManyByHashes(
            uniqueHashes,
            targetLanguage,
          )
        : [];
    const cachedByHash = new Map(
      cached.map((entry) => [entry.sourceHash, entry.translatedText]),
    );

    const pendingIndexes = [...hashByIndex.entries()]
      .filter(([, hash]) => !cachedByHash.has(hash))
      .map(([index]) => index);

    if (pendingIndexes.length > 0) {
      const pendingTexts = pendingIndexes.map((index) => texts[index]);
      const translated = await this.deepLTranslationService.translateBatch(
        pendingTexts,
        targetLanguage,
      );

      const newRecords = pendingIndexes.map((index, position) => ({
        sourceHash: hashByIndex.get(index)!,
        targetLanguage,
        sourceText: texts[index],
        translatedText: translated[position],
      }));

      await this.translationRepository.createMany(newRecords);

      newRecords.forEach((record) => {
        cachedByHash.set(record.sourceHash, record.translatedText);
      });
    }

    return texts.map((text, index) => {
      const hash = hashByIndex.get(index);
      if (!hash) return text;
      return cachedByHash.get(hash) ?? text;
    });
  }

  private hash(text: string): string {
    return createHash('sha256').update(text.trim()).digest('hex');
  }
}
