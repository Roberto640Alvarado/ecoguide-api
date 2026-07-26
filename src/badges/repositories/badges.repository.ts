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

  /** Todas las insignias configuradas para un área, sin paginar (uso interno
   * para el otorgamiento automático al terminar el recorrido). */
  findAllRawByArea(protectedAreaId: string): Promise<Badge[]> {
    return this.prisma.badge.findMany({ where: { protectedAreaId } });
  }

  /** Ids de insignias (de la lista dada) que el estudiante ya tiene. */
  async findEarnedBadgeIds(
    studentId: string,
    badgeIds: string[],
  ): Promise<Set<string>> {
    const earned = await this.prisma.studentBadge.findMany({
      where: { studentId, badgeId: { in: badgeIds } },
      select: { badgeId: true },
    });

    return new Set(earned.map((item) => item.badgeId));
  }

  /** Insignias que el estudiante ya obtuvo para un área específica. */
  async findEarnedByStudentAndArea(
    studentId: string,
    protectedAreaId: string,
  ): Promise<Badge[]> {
    const earned = await this.prisma.studentBadge.findMany({
      where: { studentId, protectedAreaId },
      orderBy: { earnedAt: 'asc' },
    });

    return this.resolveBadgesForEarnedRecords(earned);
  }

  /** Todas las insignias que el estudiante ya obtuvo, en cualquier área,
   * de la más reciente a la más antigua (uso: dashboard del estudiante). */
  async findAllByStudent(studentId: string): Promise<Badge[]> {
    const earned = await this.prisma.studentBadge.findMany({
      where: { studentId },
      orderBy: { earnedAt: 'desc' },
    });

    return this.resolveBadgesForEarnedRecords(earned);
  }

  /** Resuelve los documentos Badge de una lista de otorgamientos
   * (StudentBadge), preservando su orden. */
  private async resolveBadgesForEarnedRecords(
    earned: { badgeId: string }[],
  ): Promise<Badge[]> {
    if (earned.length === 0) {
      return [];
    }

    const badges = await this.prisma.badge.findMany({
      where: { id: { in: earned.map((item) => item.badgeId) } },
    });
    const badgesById = new Map(badges.map((badge) => [badge.id, badge]));

    return earned
      .map((item) => badgesById.get(item.badgeId))
      .filter((badge): badge is Badge => badge != null);
  }

  /** Otorga una insignia a un estudiante; no-op si ya la tenía (idempotente
   * vía el índice único [studentId, badgeId]). */
  async createStudentBadgeIfMissing(
    studentId: string,
    protectedAreaId: string,
    badgeId: string,
  ): Promise<boolean> {
    try {
      await this.prisma.studentBadge.create({
        data: { studentId, protectedAreaId, badgeId },
      });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return false;
      }
      throw error;
    }
  }
}
