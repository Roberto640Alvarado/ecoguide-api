import { Injectable } from '@nestjs/common';
import { SpeakingPractice } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateSpeakingPracticeData,
  UpdateSpeakingPracticeData,
} from '../types/speaking-practice.type';

/**
 * Responsable únicamente del acceso a datos de la colección
 * `speaking_practices`. Toda la lógica de negocio vive en
 * SpeakingPracticesService.
 */
@Injectable()
export class SpeakingPracticesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<SpeakingPractice | null> {
    return this.prisma.speakingPractice.findUnique({ where: { id } });
  }

  findByProtectedAreaId(
    protectedAreaId: string,
  ): Promise<SpeakingPractice | null> {
    return this.prisma.speakingPractice.findUnique({
      where: { protectedAreaId },
    });
  }

  create(data: CreateSpeakingPracticeData): Promise<SpeakingPractice> {
    return this.prisma.speakingPractice.create({
      data: { ...data, isActive: data.isActive ?? true },
    });
  }

  update(
    id: string,
    data: UpdateSpeakingPracticeData,
  ): Promise<SpeakingPractice> {
    return this.prisma.speakingPractice.update({ where: { id }, data });
  }

  deactivate(id: string): Promise<SpeakingPractice> {
    return this.prisma.speakingPractice.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
