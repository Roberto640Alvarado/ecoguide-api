import { Injectable } from '@nestjs/common';
import { AIProvider, AIProviderType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildDateRangeFilter } from '../../common/utils/date-range.util';
import {
  CreateAIProviderData,
  FindAIProvidersParams,
  ModelData,
  UpdateAIProviderData,
  UpdateModelData,
} from '../types/find-ai-providers-params.type';

/**
 * Responsable únicamente del acceso a datos de la colección `ai_providers`.
 * Toda la lógica de negocio vive en AIProvidersService.
 *
 * `models` es un composite type embebido de Prisma (no una colección
 * aparte); las operaciones push/updateMany/deleteMany manipulan ese array
 * directamente en el documento del proveedor.
 */
@Injectable()
export class AIProvidersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<AIProvider | null> {
    return this.prisma.aIProvider.findUnique({ where: { id } });
  }

  findByProviderName(providerName: string): Promise<AIProvider | null> {
    return this.prisma.aIProvider.findUnique({ where: { providerName } });
  }

  /**
   * Primer proveedor activo de un tipo dado, sin importar cuál AIProvider
   * concreto haya elegido el docente para las respuestas conversacionales.
   * Usado por AudioTranscriptionService: la transcripción de audio se hace
   * con el primer vendor compatible que esté activo (Groq u OpenAI),
   * independientemente del proveedor configurado en la SpeakingPractice
   * para generar las respuestas conversacionales.
   */
  findFirstActiveByType(
    providerType: AIProviderType,
  ): Promise<AIProvider | null> {
    return this.prisma.aIProvider.findFirst({
      where: { providerType, isActive: true },
    });
  }

  create(data: CreateAIProviderData): Promise<AIProvider> {
    return this.prisma.aIProvider.create({
      data: {
        ...data,
        isActive: data.isActive ?? true,
        models: data.models ?? [],
      },
    });
  }

  update(id: string, data: UpdateAIProviderData): Promise<AIProvider> {
    return this.prisma.aIProvider.update({ where: { id }, data });
  }

  deactivate(id: string): Promise<AIProvider> {
    return this.prisma.aIProvider.update({
      where: { id },
      data: { isActive: false },
    });
  }

  addModel(id: string, model: ModelData): Promise<AIProvider> {
    return this.prisma.aIProvider.update({
      where: { id },
      data: { models: { push: model } },
    });
  }

  updateModel(
    id: string,
    modelId: string,
    data: UpdateModelData,
  ): Promise<AIProvider> {
    return this.prisma.aIProvider.update({
      where: { id },
      data: {
        models: {
          updateMany: {
            where: { id: modelId },
            data,
          },
        },
      },
    });
  }

  removeModel(id: string, modelId: string): Promise<AIProvider> {
    return this.prisma.aIProvider.update({
      where: { id },
      data: {
        models: {
          deleteMany: {
            where: { id: modelId },
          },
        },
      },
    });
  }

  async findAll(
    params: FindAIProvidersParams,
  ): Promise<{ items: AIProvider[]; total: number }> {
    const {
      page,
      limit,
      search,
      isActive,
      createdFrom,
      createdTo,
      sortField,
      sortOrder,
    } = params;

    const createdAtFilter = buildDateRangeFilter(createdFrom, createdTo);

    const where: Prisma.AIProviderWhereInput = {
      ...(isActive !== undefined && { isActive }),
      ...(createdAtFilter && { createdAt: createdAtFilter }),
      ...(search && {
        providerName: { contains: search, mode: 'insensitive' },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.aIProvider.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: sortOrder },
      }),
      this.prisma.aIProvider.count({ where }),
    ]);

    return { items, total };
  }
}
