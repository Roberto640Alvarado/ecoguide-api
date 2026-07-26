import { Injectable } from '@nestjs/common';
import { Prisma, TranslationCache } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Responsable únicamente del acceso a datos de la colección
 * `translation_cache`. Toda la lógica (armar el hash, decidir qué traducir,
 * llamar a DeepL) vive en TranslationService.
 */
@Injectable()
export class TranslationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByHashes(
    sourceHashes: string[],
    targetLanguage: string,
  ): Promise<TranslationCache[]> {
    return this.prisma.translationCache.findMany({
      where: { sourceHash: { in: sourceHashes }, targetLanguage },
    });
  }

  /**
   * Inserta las traducciones nuevas. El conector de Mongo de Prisma no
   * soporta `skipDuplicates` en `createMany`, así que se insertan una por
   * una ignorando el conflicto de índice único (P2002) — puede pasar si dos
   * requests concurrentes traducen el mismo texto al mismo tiempo.
   */
  async createMany(
    records: {
      sourceHash: string;
      targetLanguage: string;
      sourceText: string;
      translatedText: string;
    }[],
  ): Promise<void> {
    await Promise.all(
      records.map((record) =>
        this.prisma.translationCache.create({ data: record }).catch((error) => {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            return;
          }
          throw error;
        }),
      ),
    );
  }
}
