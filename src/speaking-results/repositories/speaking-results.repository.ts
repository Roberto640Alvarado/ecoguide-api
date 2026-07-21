import { Injectable } from '@nestjs/common';
import { Prisma, SpeakingResult } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSpeakingResultData,
  FindSpeakingResultsParams,
} from '../types/speaking-result.type';

/**
 * Responsable únicamente del acceso a datos de la colección
 * `speaking_results`. Toda la lógica de negocio (validar la práctica, llamar
 * a la IA, parsear la retroalimentación) vive en SpeakingResultsService.
 */
@Injectable()
export class SpeakingResultsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateSpeakingResultData): Promise<SpeakingResult> {
    return this.prisma.speakingResult.create({ data });
  }

  async findAllByStudentAndArea(
    studentId: string,
    protectedAreaId: string,
    params: FindSpeakingResultsParams,
  ): Promise<{ items: SpeakingResult[]; total: number }> {
    const { page, limit, sortField, sortOrder } = params;

    const where: Prisma.SpeakingResultWhereInput = {
      studentId,
      protectedAreaId,
    };

    const [items, total] = await Promise.all([
      this.prisma.speakingResult.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: sortOrder },
      }),
      this.prisma.speakingResult.count({ where }),
    ]);

    return { items, total };
  }
}
