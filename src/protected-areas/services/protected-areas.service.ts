import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProtectedArea, UserRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { ProtectedAreasRepository } from '../repositories/protected-areas.repository';
import { CreateProtectedAreaDto } from '../dto/create-protected-area.dto';
import { UpdateProtectedAreaDto } from '../dto/update-protected-area.dto';
import { FindProtectedAreasQueryDto } from '../dto/find-protected-areas-query.dto';
import { ProtectedAreaResponseDoc } from '../doc/protected-area-response.doc';
import { PROTECTED_AREA_SORTABLE_FIELDS } from '../types/find-protected-areas-params.type';
import {
  PaginatedResult,
  parseSort,
} from '../../common/interfaces/paginated-result.interface';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

/**
 * Contiene toda la lógica de negocio de las áreas protegidas.
 *
 * Visibilidad: los STUDENT solo pueden ver áreas publicadas (isPublished =
 * true); los TEACHER ven todo y pueden filtrar por isPublished si lo desean.
 *
 * "Eliminar" un área protegida se implementa como soft delete
 * (isPublished = false) en vez de un hard delete, porque ProtectedArea tiene
 * relaciones con onDelete: Cascade hacia FlashCard, SpeakingPractice,
 * ChatbotConfig, Test, StudentProgress, SpeakingResult, ChatbotConversation,
 * StudentTest y Badge — un borrado real destruiría todo ese contenido
 * dependiente.
 */
@Injectable()
export class ProtectedAreasService {
  constructor(
    private readonly protectedAreasRepository: ProtectedAreasRepository,
  ) {}

  async findAll(
    query: FindProtectedAreasQueryDto,
    requester: AuthenticatedUser,
  ): Promise<PaginatedResult<ProtectedAreaResponseDoc>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { field: sortField, order: sortOrder } = parseSort(
      query.sort,
      PROTECTED_AREA_SORTABLE_FIELDS,
      'createdAt',
    );

    const isPublished =
      requester.role === UserRole.STUDENT ? true : query.isPublished;

    const { items, total } = await this.protectedAreasRepository.findAll({
      page,
      limit,
      search: query.search,
      isPublished,
      sortField,
      sortOrder,
    });

    return {
      items: items.map((area) =>
        plainToInstance(ProtectedAreaResponseDoc, area, {
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

  async findByIdOrThrow(
    id: string,
    requester: AuthenticatedUser,
  ): Promise<ProtectedAreaResponseDoc> {
    const area = await this.getAreaOrThrow(id);

    if (requester.role === UserRole.STUDENT && !area.isPublished) {
      throw new NotFoundException('Área protegida no encontrada.');
    }

    return plainToInstance(ProtectedAreaResponseDoc, area, {
      excludeExtraneousValues: true,
    });
  }

  async create(
    dto: CreateProtectedAreaDto,
    createdBy: string,
  ): Promise<ProtectedAreaResponseDoc> {
    const area = await this.protectedAreasRepository.create({
      ...dto,
      createdBy,
    });

    return plainToInstance(ProtectedAreaResponseDoc, area, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    dto: UpdateProtectedAreaDto,
  ): Promise<ProtectedAreaResponseDoc> {
    await this.getAreaOrThrow(id);

    const updated = await this.protectedAreasRepository.update(id, dto);

    return plainToInstance(ProtectedAreaResponseDoc, updated, {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: string): Promise<void> {
    await this.getAreaOrThrow(id);
    await this.protectedAreasRepository.unpublish(id);
  }

  /**
   * Verifica la existencia de un área protegida por id. Pensado para que
   * otros módulos (p. ej. FlashCards) validen su FK sin depender del
   * repositorio de ProtectedAreas, manteniendo el acceso a datos encapsulado.
   */
  async existsById(id: string): Promise<boolean> {
    if (!OBJECT_ID_REGEX.test(id)) {
      return false;
    }

    return this.protectedAreasRepository.exists(id);
  }

  private async getAreaOrThrow(id: string): Promise<ProtectedArea> {
    if (!OBJECT_ID_REGEX.test(id)) {
      throw new BadRequestException('El id proporcionado no es válido.');
    }

    const area = await this.protectedAreasRepository.findById(id);

    if (!area) {
      throw new NotFoundException('Área protegida no encontrada.');
    }

    return area;
  }
}
