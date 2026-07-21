import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FlashCard, FlashCardType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { FlashCardsRepository } from '../repositories/flash-cards.repository';
import { CreateFlashCardDto } from '../dto/create-flash-card.dto';
import { UpdateFlashCardDto } from '../dto/update-flash-card.dto';
import { FindFlashCardsQueryDto } from '../dto/find-flash-cards-query.dto';
import { FlashCardResponseDoc } from '../doc/flash-card-response.doc';
import {
  FLASH_CARD_SORTABLE_FIELDS,
  FLASH_CARD_TYPE_RANK,
} from '../types/find-flash-cards-params.type';
import {
  PaginatedResult,
  parseSort,
} from '../../common/interfaces/paginated-result.interface';
import { ProtectedAreasService } from '../../protected-areas/services/protected-areas.service';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

/**
 * Contiene toda la lógica de negocio de las flashcards.
 *
 * Reglas propias del dominio:
 * - protectedAreaId debe referenciar un área protegida existente.
 * - Las flashcards de tipo ENVIRONMENTAL requieren question, al menos 2
 *   options y un correctAnswer que esté contenido en options.
 * - No existen relaciones con onDelete: Cascade que dependan de FlashCard,
 *   por lo que eliminar una flashcard es un hard delete (a diferencia de
 *   Users/ProtectedAreas, que usan soft delete).
 */
@Injectable()
export class FlashCardsService {
  constructor(
    private readonly flashCardsRepository: FlashCardsRepository,
    private readonly protectedAreasService: ProtectedAreasService,
  ) {}

  async findAllByArea(
    query: FindFlashCardsQueryDto,
  ): Promise<PaginatedResult<FlashCardResponseDoc>> {
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
      FLASH_CARD_SORTABLE_FIELDS,
      'order',
    );

    const { items, total } = await this.flashCardsRepository.findAll({
      page,
      limit,
      search: query.search,
      protectedAreaId: query.protectedAreaId,
      type: query.type,
      sortField,
      sortOrder,
    });

    return {
      items: items.map((card) =>
        plainToInstance(FlashCardResponseDoc, card, {
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

  async findByIdOrThrow(id: string): Promise<FlashCardResponseDoc> {
    const card = await this.getCardOrThrow(id);

    return plainToInstance(FlashCardResponseDoc, card, {
      excludeExtraneousValues: true,
    });
  }

  async create(dto: CreateFlashCardDto): Promise<FlashCardResponseDoc> {
    const areaExists = await this.protectedAreasService.existsById(
      dto.protectedAreaId,
    );

    if (!areaExists) {
      throw new NotFoundException('Área protegida no encontrada.');
    }

    this.validateEnvironmentalFields({
      type: dto.type,
      question: dto.question,
      options: dto.options,
      correctAnswer: dto.correctAnswer,
    });

    const order =
      dto.order ?? (await this.resolveNextOrder(dto.protectedAreaId, dto.type));

    const card = await this.flashCardsRepository.create({ ...dto, order });

    return plainToInstance(FlashCardResponseDoc, card, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    dto: UpdateFlashCardDto,
  ): Promise<FlashCardResponseDoc> {
    const existing = await this.getCardOrThrow(id);

    const effectiveType = dto.type ?? existing.type;

    this.validateEnvironmentalFields({
      type: effectiveType,
      question: dto.question ?? existing.question ?? undefined,
      options: dto.options ?? existing.options,
      correctAnswer: dto.correctAnswer ?? existing.correctAnswer ?? undefined,
    });

    // Si cambia de categoría y no se envió un order explícito, se
    // recalcula para que la flashcard "salte" al bloque de la nueva
    // categoría en vez de quedarse con el order de la categoría anterior.
    const order =
      dto.order ??
      (dto.type && dto.type !== existing.type
        ? await this.resolveNextOrder(existing.protectedAreaId, dto.type)
        : undefined);

    const updated = await this.flashCardsRepository.update(id, {
      ...dto,
      ...(order !== undefined && { order }),
    });

    return plainToInstance(FlashCardResponseDoc, updated, {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: string): Promise<void> {
    await this.getCardOrThrow(id);
    await this.flashCardsRepository.remove(id);
  }

  private validateEnvironmentalFields(data: {
    type: FlashCardType;
    question?: string;
    options?: string[];
    correctAnswer?: string;
  }): void {
    if (data.type !== FlashCardType.ENVIRONMENTAL) {
      return;
    }

    if (!data.question) {
      throw new BadRequestException(
        'La pregunta es requerida para flashcards de tipo ENVIRONMENTAL.',
      );
    }

    if (!data.options || data.options.length < 2) {
      throw new BadRequestException(
        'Debe haber al menos 2 opciones para flashcards de tipo ENVIRONMENTAL.',
      );
    }

    if (!data.correctAnswer || !data.options.includes(data.correctAnswer)) {
      throw new BadRequestException(
        'La respuesta correcta debe ser una de las opciones proporcionadas.',
      );
    }
  }

  /**
   * Calcula el siguiente `order` para una flashcard cuando no se recibe uno
   * explícito: agrupa por el rango fijo de su categoría (ver
   * FLASH_CARD_TYPE_RANK) y, dentro de esa categoría, la coloca después de
   * las que ya existen en el área.
   */
  private async resolveNextOrder(
    protectedAreaId: string,
    type: FlashCardType,
  ): Promise<number> {
    const existingCount = await this.flashCardsRepository.countByAreaAndType(
      protectedAreaId,
      type,
    );

    return FLASH_CARD_TYPE_RANK[type] * 1000 + existingCount + 1;
  }

  private async getCardOrThrow(id: string): Promise<FlashCard> {
    if (!OBJECT_ID_REGEX.test(id)) {
      throw new BadRequestException('El id proporcionado no es válido.');
    }

    const card = await this.flashCardsRepository.findById(id);

    if (!card) {
      throw new NotFoundException('Flashcard no encontrada.');
    }

    return card;
  }
}
