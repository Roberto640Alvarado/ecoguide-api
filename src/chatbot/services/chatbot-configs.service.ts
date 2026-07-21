import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChatbotConfig } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { ChatbotConfigsRepository } from '../repositories/chatbot-configs.repository';
import { CreateChatbotConfigDto } from '../dto/create-chatbot-config.dto';
import { UpdateChatbotConfigDto } from '../dto/update-chatbot-config.dto';
import { ChatbotConfigResponseDoc } from '../doc/chatbot-config-response.doc';
import { ProtectedAreasService } from '../../protected-areas/services/protected-areas.service';
import { AIProvidersService } from '../../ai-providers/services/ai-providers.service';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

/**
 * Contiene toda la lógica de negocio de la config del chatbot del docente.
 * Es 1:1 con el área protegida (@unique en schema.prisma, igual patrón que
 * SpeakingPracticesService). El endpoint "por área" devuelve `null` cuando
 * aún no se ha configurado.
 */
@Injectable()
export class ChatbotConfigsService {
  constructor(
    private readonly chatbotConfigsRepository: ChatbotConfigsRepository,
    private readonly protectedAreasService: ProtectedAreasService,
    private readonly aiProvidersService: AIProvidersService,
  ) {}

  async findByProtectedArea(
    protectedAreaId: string,
  ): Promise<ChatbotConfigResponseDoc | null> {
    const areaExists =
      await this.protectedAreasService.existsById(protectedAreaId);

    if (!areaExists) {
      throw new NotFoundException('Área protegida no encontrada.');
    }

    const config =
      await this.chatbotConfigsRepository.findByProtectedAreaId(
        protectedAreaId,
      );

    return config ? this.toResponseDoc(config) : null;
  }

  async findByIdOrThrow(id: string): Promise<ChatbotConfigResponseDoc> {
    const config = await this.getConfigOrThrow(id);

    return this.toResponseDoc(config);
  }

  async create(dto: CreateChatbotConfigDto): Promise<ChatbotConfigResponseDoc> {
    const areaExists = await this.protectedAreasService.existsById(
      dto.protectedAreaId,
    );

    if (!areaExists) {
      throw new NotFoundException('Área protegida no encontrada.');
    }

    const existing = await this.chatbotConfigsRepository.findByProtectedAreaId(
      dto.protectedAreaId,
    );

    if (existing) {
      throw new ConflictException(
        'Esta área protegida ya tiene un chatbot configurado. Edítalo en vez de crear otro.',
      );
    }

    await this.validateProviderAndModel(dto.providerId, dto.model);

    const config = await this.chatbotConfigsRepository.create(dto);

    return this.toResponseDoc(config);
  }

  async update(
    id: string,
    dto: UpdateChatbotConfigDto,
  ): Promise<ChatbotConfigResponseDoc> {
    const existing = await this.getConfigOrThrow(id);

    await this.validateProviderAndModel(
      dto.providerId ?? existing.providerId,
      dto.model ?? existing.model,
    );

    const updated = await this.chatbotConfigsRepository.update(id, dto);

    return this.toResponseDoc(updated);
  }

  async deactivate(id: string): Promise<void> {
    await this.getConfigOrThrow(id);
    await this.chatbotConfigsRepository.deactivate(id);
  }

  private async validateProviderAndModel(
    providerId: string,
    model: string,
  ): Promise<void> {
    const provider = await this.aiProvidersService.findByIdOrThrow(providerId);

    if (!provider.isActive) {
      throw new BadRequestException(
        'El proveedor de IA seleccionado está inactivo.',
      );
    }

    const modelConfig = provider.models.find(
      (candidate) => candidate.model === model,
    );

    if (!modelConfig || !modelConfig.isActive) {
      throw new BadRequestException(
        'El modelo seleccionado no existe o está inactivo para este proveedor.',
      );
    }
  }

  private toResponseDoc(config: ChatbotConfig): ChatbotConfigResponseDoc {
    return plainToInstance(ChatbotConfigResponseDoc, config, {
      excludeExtraneousValues: true,
    });
  }

  private async getConfigOrThrow(id: string): Promise<ChatbotConfig> {
    if (!OBJECT_ID_REGEX.test(id)) {
      throw new BadRequestException('El id proporcionado no es válido.');
    }

    const config = await this.chatbotConfigsRepository.findById(id);

    if (!config) {
      throw new NotFoundException('Configuración de chatbot no encontrada.');
    }

    return config;
  }
}
