import { Injectable } from '@nestjs/common';
import { FlashCard, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateFlashCardData,
  FindFlashCardsParams,
  UpdateFlashCardData,
} from '../types/find-flash-cards-params.type';

/**
 * Responsable únicamente del acceso a datos de la colección `flash_cards`.
 * Toda la lógica de negocio vive en FlashCardsService.
 */
@Injectable()
export class FlashCardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<FlashCard | null> {
    return this.prisma.flashCard.findUnique({ where: { id } });
  }

  /**
   * Cantidad de flashcards de un tipo específico ya existentes en un área.
   * Usado por el service para auto-asignar `order` cuando no se recibe uno
   * explícito.
   */
  countByAreaAndType(
    protectedAreaId: string,
    type: FlashCard['type'],
  ): Promise<number> {
    return this.prisma.flashCard.count({ where: { protectedAreaId, type } });
  }

  create(data: CreateFlashCardData): Promise<FlashCard> {
    return this.prisma.flashCard.create({
      data: {
        ...data,
        options: data.options ?? [],
      },
    });
  }

  update(id: string, data: UpdateFlashCardData): Promise<FlashCard> {
    return this.prisma.flashCard.update({ where: { id }, data });
  }

  remove(id: string): Promise<FlashCard> {
    return this.prisma.flashCard.delete({ where: { id } });
  }

  async findAll(
    params: FindFlashCardsParams,
  ): Promise<{ items: FlashCard[]; total: number }> {
    const { page, limit, search, protectedAreaId, type, sortField, sortOrder } =
      params;

    const where: Prisma.FlashCardWhereInput = {
      protectedAreaId,
      ...(type && { type }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.flashCard.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: sortOrder },
      }),
      this.prisma.flashCard.count({ where }),
    ]);

    return { items, total };
  }
}
