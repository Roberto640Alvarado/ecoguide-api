import { Injectable } from '@nestjs/common';
import { Prisma, ProtectedArea } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateProtectedAreaData,
  FindProtectedAreasParams,
  UpdateProtectedAreaData,
} from '../types/find-protected-areas-params.type';

/**
 * Responsable únicamente del acceso a datos de la colección
 * `protected_areas`. Toda la lógica de negocio vive en ProtectedAreasService.
 */
@Injectable()
export class ProtectedAreasRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<ProtectedArea | null> {
    return this.prisma.protectedArea.findUnique({ where: { id } });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.protectedArea.count({ where: { id } });

    return count > 0;
  }

  create(data: CreateProtectedAreaData): Promise<ProtectedArea> {
    return this.prisma.protectedArea.create({
      data: {
        ...data,
        images: data.images ?? [],
        isPublished: data.isPublished ?? false,
      },
    });
  }

  update(id: string, data: UpdateProtectedAreaData): Promise<ProtectedArea> {
    return this.prisma.protectedArea.update({ where: { id }, data });
  }

  unpublish(id: string): Promise<ProtectedArea> {
    return this.prisma.protectedArea.update({
      where: { id },
      data: { isPublished: false },
    });
  }

  async findAll(
    params: FindProtectedAreasParams,
  ): Promise<{ items: ProtectedArea[]; total: number }> {
    const { page, limit, search, isPublished, sortField, sortOrder } = params;

    const where: Prisma.ProtectedAreaWhereInput = {
      ...(isPublished !== undefined && { isPublished }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.protectedArea.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: sortOrder },
      }),
      this.prisma.protectedArea.count({ where }),
    ]);

    return { items, total };
  }
}
