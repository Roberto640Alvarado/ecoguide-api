import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Badge } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { BadgesRepository } from '../repositories/badges.repository';
import { CreateBadgeDto } from '../dto/create-badge.dto';
import { UpdateBadgeDto } from '../dto/update-badge.dto';
import { FindBadgesQueryDto } from '../dto/find-badges-query.dto';
import { BadgeResponseDoc } from '../doc/badge-response.doc';
import { BadgeAwardResultDoc } from '../doc/badge-award-result.doc';
import { BADGE_SORTABLE_FIELDS } from '../types/find-badges-params.type';
import {
  PaginatedResult,
  parseSort,
} from '../../common/interfaces/paginated-result.interface';
import { ProtectedAreasService } from '../../protected-areas/services/protected-areas.service';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

/**
 * Contiene toda la lógica de negocio de las insignias (badges).
 *
 * Reglas propias del dominio:
 * - protectedAreaId debe referenciar un área protegida existente.
 * - La imagen debe ser PNG; la validación de formato ocurre en el endpoint
 *   de subida (upload-files), aquí solo se persiste la URL resultante.
 * - Eliminar una insignia es un hard delete (mismo criterio que FlashCard);
 *   sí existe onDelete: Cascade desde StudentBadge hacia Badge, así que los
 *   registros de otorgamiento de una insignia eliminada se limpian solos.
 * - El otorgamiento automático (ver awardAreaBadgesToStudent) lo dispara
 *   StudentProgressService cuando el estudiante termina el recorrido de un
 *   área; este servicio solo persiste el otorgamiento de forma idempotente.
 */
@Injectable()
export class BadgesService {
  constructor(
    private readonly badgesRepository: BadgesRepository,
    private readonly protectedAreasService: ProtectedAreasService,
  ) {}

  async findAllByArea(
    query: FindBadgesQueryDto,
  ): Promise<PaginatedResult<BadgeResponseDoc>> {
    const areaExists = await this.protectedAreasService.existsById(
      query.protectedAreaId,
    );

    if (!areaExists) {
      throw new NotFoundException('Área protegida no encontrada.');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { field: sortField, order: sortOrder } = parseSort(
      query.sort,
      BADGE_SORTABLE_FIELDS,
      'createdAt',
    );

    const { items, total } = await this.badgesRepository.findAll({
      page,
      limit,
      search: query.search,
      protectedAreaId: query.protectedAreaId,
      sortField,
      sortOrder,
    });

    return {
      items: items.map((badge) =>
        plainToInstance(BadgeResponseDoc, badge, {
          excludeExtraneousValues: true,
        }),
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findByIdOrThrow(id: string): Promise<BadgeResponseDoc> {
    const badge = await this.getBadgeOrThrow(id);

    return plainToInstance(BadgeResponseDoc, badge, {
      excludeExtraneousValues: true,
    });
  }

  async create(dto: CreateBadgeDto): Promise<BadgeResponseDoc> {
    const areaExists = await this.protectedAreasService.existsById(
      dto.protectedAreaId,
    );

    if (!areaExists) {
      throw new NotFoundException('Área protegida no encontrada.');
    }

    const badge = await this.badgesRepository.create(dto);

    return plainToInstance(BadgeResponseDoc, badge, {
      excludeExtraneousValues: true,
    });
  }

  async update(id: string, dto: UpdateBadgeDto): Promise<BadgeResponseDoc> {
    await this.getBadgeOrThrow(id);

    const updated = await this.badgesRepository.update(id, dto);

    return plainToInstance(BadgeResponseDoc, updated, {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: string): Promise<void> {
    await this.getBadgeOrThrow(id);
    await this.badgesRepository.remove(id);
  }

  /** Insignias que un estudiante ya obtuvo para un área específica. */
  async getEarnedForStudentAndArea(
    studentId: string,
    protectedAreaId: string,
  ): Promise<BadgeResponseDoc[]> {
    const earned = await this.badgesRepository.findEarnedByStudentAndArea(
      studentId,
      protectedAreaId,
    );

    return earned.map((badge) =>
      plainToInstance(BadgeResponseDoc, badge, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /** Todas las insignias que el estudiante ya obtuvo, en cualquier área
   * (uso: dashboard del estudiante). */
  async getAllEarnedForStudent(studentId: string): Promise<BadgeResponseDoc[]> {
    const earned = await this.badgesRepository.findAllByStudent(studentId);

    return earned.map((badge) =>
      plainToInstance(BadgeResponseDoc, badge, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Otorga al estudiante todas las insignias configuradas para un área
   * (normalmente una sola, pero soporta varias) que todavía no tenga.
   * Idempotente: si ya las tiene todas, `justUnlocked` queda vacío.
   * Se llama solo cuando StudentProgressService ya determinó que el
   * estudiante terminó el recorrido — este método no vuelve a validar esa
   * condición, solo persiste el otorgamiento.
   */
  async awardAreaBadgesToStudent(
    studentId: string,
    protectedAreaId: string,
  ): Promise<BadgeAwardResultDoc> {
    const badges =
      await this.badgesRepository.findAllRawByArea(protectedAreaId);

    if (badges.length === 0) {
      return plainToInstance(
        BadgeAwardResultDoc,
        { completed: true, justUnlocked: [], earnedBadges: [] },
        { excludeExtraneousValues: true },
      );
    }

    const alreadyEarnedIds = await this.badgesRepository.findEarnedBadgeIds(
      studentId,
      badges.map((badge) => badge.id),
    );
    const pending = badges.filter((badge) => !alreadyEarnedIds.has(badge.id));

    await Promise.all(
      pending.map((badge) =>
        this.badgesRepository.createStudentBadgeIfMissing(
          studentId,
          protectedAreaId,
          badge.id,
        ),
      ),
    );

    return plainToInstance(
      BadgeAwardResultDoc,
      {
        completed: true,
        justUnlocked: pending,
        earnedBadges: badges,
      },
      { excludeExtraneousValues: true },
    );
  }

  private async getBadgeOrThrow(id: string): Promise<Badge> {
    if (!OBJECT_ID_REGEX.test(id)) {
      throw new BadRequestException('El id proporcionado no es válido.');
    }

    const badge = await this.badgesRepository.findById(id);

    if (!badge) {
      throw new NotFoundException('Insignia no encontrada.');
    }

    return badge;
  }
}
