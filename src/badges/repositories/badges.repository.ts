import { Injectable } from '@nestjs/common';
import { Badge, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateBadgeData,
  FindBadgesParams,
  UpdateBadgeData,
} from '../types/find-badges-params.type';

/**
 * Responsable únicamente del acceso a datos de la colección `badges`.
 * Toda la lógica de negocio vive en BadgesService.
 */
@Injectable()
export class BadgesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Badge | null> {
    return this.prisma.badge.findUnique({ where: { id } });
  }

  create(data: CreateBadgeData): Promise<Badge> {
    return this.prisma.badge.create({ data });
  }

  update(id: string, data: UpdateBadgeData): Promise<Badge> {
    return this.prisma.badge.update({ where: { id }, data });
  }

  remove(id: string): Promise<Badge> {
    return this.prisma.badge.delete({ where: { id } });
  }

  async findAll(
    params: FindBadgesParams,
  ): Promise<{ items: Badge[]; total: number }> {
    const { page, limit, search, protectedAreaId, sortField, sortOrder } =
      params;

    const where: Prisma.BadgeWhereInput = {
      protectedAreaId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.badge.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: sortOrder },
      }),
      this.prisma.badge.count({ where }),
    ]);

    return { items, total };
  }
}
