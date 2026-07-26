import { Injectable } from '@nestjs/common';
import { Prisma, SpeakingResult } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSpeakingResultData,
  FindSpeakingResultsParams,
  SpeakingTurnData,
} from '../types/speaking-result.type';

/**
 * Responsable únicamente del acceso a datos de la colección
 * `speaking_results`. `turns` es un composite type embebido de Prisma (no
 * una colección aparte); `addTurns` usa `push` para agregar al array sin
 * reemplazarlo (mismo patrón que ChatbotConversationsRepository.addMessages).
 */
@Injectable()
export class SpeakingResultsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<SpeakingResult | null> {
    return this.prisma.speakingResult.findUnique({ where: { id } });
  }

  create(data: CreateSpeakingResultData): Promise<SpeakingResult> {
    return this.prisma.speakingResult.create({ data });
  }

  addTurns(id: string, turns: SpeakingTurnData[]): Promise<SpeakingResult> {
    return this.prisma.speakingResult.update({
      where: { id },
      data: { turns: { push: turns } },
    });
  }

  finish(id: string, feedback: string, score: number): Promise<SpeakingResult> {
    return this.prisma.speakingResult.update({
      where: { id },
      data: { endedAt: new Date(), feedback, score },
    });
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

  /**
   * Usado por StudentProgress para armar el resumen de un área: cuántas
   * llamadas de speaking tuvo el estudiante, cuántas finalizó, y su mejor
   * calificación entre las finalizadas (mismo patrón que
   * ChatbotConversationsRepository.getSummaryByStudentAndArea).
   */
  async getSummaryByStudentAndArea(
    studentId: string,
    protectedAreaId: string,
  ): Promise<{
    attempts: number;
    finished: number;
    bestScore: number | null;
  }> {
    const where: Prisma.SpeakingResultWhereInput = {
      studentId,
      protectedAreaId,
    };
    const finishedWhere: Prisma.SpeakingResultWhereInput = {
      ...where,
      endedAt: { not: null },
    };

    const [attempts, finished, best] = await Promise.all([
      this.prisma.speakingResult.count({ where }),
      this.prisma.speakingResult.count({ where: finishedWhere }),
      this.prisma.speakingResult.findFirst({
        where: finishedWhere,
        orderBy: { score: 'desc' },
      }),
    ]);

    return { attempts, finished, bestScore: best?.score ?? null };
  }
}
