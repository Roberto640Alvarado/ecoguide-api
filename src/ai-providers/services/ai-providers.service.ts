import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AIProvider } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { randomUUID } from 'crypto';
import { AIProvidersRepository } from '../repositories/ai-providers.repository';
import { ApiKeyEncryptionService } from './api-key-encryption.service';
import { CreateAIProviderDto } from '../dto/create-ai-provider.dto';
import { UpdateAIProviderDto } from '../dto/update-ai-provider.dto';
import { CreateModelDto } from '../dto/create-model.dto';
import { UpdateModelDto } from '../dto/update-model.dto';
import { FindAIProvidersQueryDto } from '../dto/find-ai-providers-query.dto';
import { AIProviderResponseDoc } from '../doc/ai-provider-response.doc';
import { AI_PROVIDER_SORTABLE_FIELDS } from '../types/find-ai-providers-params.type';
import {
  PaginatedResult,
  parseSort,
} from '../../common/interfaces/paginated-result.interface';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

/**
 * Contiene toda la lógica de negocio de los proveedores de IA.
 *
 * - El apiKey nunca se guarda en texto plano: se cifra con
 *   ApiKeyEncryptionService antes de persistirse y jamás se incluye en las
 *   respuestas (ver AIProviderResponseDoc).
 * - "Eliminar" un proveedor se implementa como soft delete (isActive =
 *   false), porque AIProvider tiene relaciones con onDelete: Cascade hacia
 *   SpeakingPractice y ChatbotConfig — un borrado real destruiría esas
 *   configuraciones dependientes.
 * - Los modelos (models[]) son un composite type embebido de Prisma; se
 *   administran con push/updateMany/deleteMany en vez de reemplazar el
 *   array completo.
 */
@Injectable()
export class AIProvidersService {
  constructor(
    private readonly aiProvidersRepository: AIProvidersRepository,
    private readonly apiKeyEncryptionService: ApiKeyEncryptionService,
  ) {}

  async findAll(
    query: FindAIProvidersQueryDto,
  ): Promise<PaginatedResult<AIProviderResponseDoc>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { field: sortField, order: sortOrder } = parseSort(
      query.sort,
      AI_PROVIDER_SORTABLE_FIELDS,
      'createdAt',
    );

    const { items, total } = await this.aiProvidersRepository.findAll({
      page,
      limit,
      search: query.search,
      isActive: query.isActive,
      sortField,
      sortOrder,
    });

    return {
      items: items.map((provider) => this.toResponseDoc(provider)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findByIdOrThrow(id: string): Promise<AIProviderResponseDoc> {
    const provider = await this.getProviderOrThrow(id);

    return this.toResponseDoc(provider);
  }

  async create(dto: CreateAIProviderDto): Promise<AIProviderResponseDoc> {
    const existing = await this.aiProvidersRepository.findByProviderName(
      dto.providerName,
    );

    if (existing) {
      throw new ConflictException(
        'Ya existe un proveedor registrado con este nombre.',
      );
    }

    const apiKeyEncrypted = this.apiKeyEncryptionService.encrypt(dto.apiKey);

    const provider = await this.aiProvidersRepository.create({
      providerName: dto.providerName,
      apiKeyEncrypted,
      isActive: dto.isActive,
      models: dto.models?.map((model) => this.toModelData(model)),
    });

    return this.toResponseDoc(provider);
  }

  async update(
    id: string,
    dto: UpdateAIProviderDto,
  ): Promise<AIProviderResponseDoc> {
    await this.getProviderOrThrow(id);

    if (dto.providerName) {
      const existing = await this.aiProvidersRepository.findByProviderName(
        dto.providerName,
      );

      if (existing && existing.id !== id) {
        throw new ConflictException(
          'Ya existe un proveedor registrado con este nombre.',
        );
      }
    }

    const updated = await this.aiProvidersRepository.update(id, {
      providerName: dto.providerName,
      isActive: dto.isActive,
      apiKeyEncrypted: dto.apiKey
        ? this.apiKeyEncryptionService.encrypt(dto.apiKey)
        : undefined,
    });

    return this.toResponseDoc(updated);
  }

  async deactivate(id: string): Promise<void> {
    await this.getProviderOrThrow(id);
    await this.aiProvidersRepository.deactivate(id);
  }

  async addModel(
    id: string,
    dto: CreateModelDto,
  ): Promise<AIProviderResponseDoc> {
    await this.getProviderOrThrow(id);

    const updated = await this.aiProvidersRepository.addModel(
      id,
      this.toModelData(dto),
    );

    return this.toResponseDoc(updated);
  }

  async updateModel(
    id: string,
    modelId: string,
    dto: UpdateModelDto,
  ): Promise<AIProviderResponseDoc> {
    const provider = await this.getProviderOrThrow(id);
    this.getModelOrThrow(provider, modelId);

    const updated = await this.aiProvidersRepository.updateModel(
      id,
      modelId,
      dto,
    );

    return this.toResponseDoc(updated);
  }

  async removeModel(
    id: string,
    modelId: string,
  ): Promise<AIProviderResponseDoc> {
    const provider = await this.getProviderOrThrow(id);
    this.getModelOrThrow(provider, modelId);

    const updated = await this.aiProvidersRepository.removeModel(id, modelId);

    return this.toResponseDoc(updated);
  }

  /**
   * Descifra el apiKey de un proveedor. Uso interno exclusivo para otros
   * módulos/servicios que necesiten llamar al proveedor de IA real (p. ej.
   * Chatbot, SpeakingPractices) — nunca se expone vía controller.
   */
  async getDecryptedApiKey(id: string): Promise<string> {
    const provider = await this.getProviderOrThrow(id);

    return this.apiKeyEncryptionService.decrypt(provider.apiKeyEncrypted);
  }

  private toModelData(dto: CreateModelDto) {
    return {
      id: randomUUID(),
      name: dto.name,
      model: dto.model,
      isActive: dto.isActive ?? true,
    };
  }

  private toResponseDoc(provider: AIProvider): AIProviderResponseDoc {
    return plainToInstance(AIProviderResponseDoc, provider, {
      excludeExtraneousValues: true,
    });
  }

  private getModelOrThrow(provider: AIProvider, modelId: string): void {
    const model = provider.models.find((m) => m.id === modelId);

    if (!model) {
      throw new NotFoundException('Modelo no encontrado en este proveedor.');
    }
  }

  private async getProviderOrThrow(id: string): Promise<AIProvider> {
    if (!OBJECT_ID_REGEX.test(id)) {
      throw new BadRequestException('El id proporcionado no es válido.');
    }

    const provider = await this.aiProvidersRepository.findById(id);

    if (!provider) {
      throw new NotFoundException('Proveedor de IA no encontrado.');
    }

    return provider;
  }
}
