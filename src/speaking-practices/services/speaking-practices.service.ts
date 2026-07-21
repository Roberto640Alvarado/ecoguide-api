import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SpeakingPractice } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { SpeakingPracticesRepository } from '../repositories/speaking-practices.repository';
import { CreateSpeakingPracticeDto } from '../dto/create-speaking-practice.dto';
import { UpdateSpeakingPracticeDto } from '../dto/update-speaking-practice.dto';
import { SpeakingPracticeResponseDoc } from '../doc/speaking-practice-response.doc';
import { ProtectedAreasService } from '../../protected-areas/services/protected-areas.service';
import { AIProvidersService } from '../../ai-providers/services/ai-providers.service';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

/**
 * Contiene toda la lógica de negocio de la práctica de speaking del
 * docente. Es 1:1 con el área protegida (ver @unique en schema.prisma): un
 * área tiene a lo sumo una práctica configurada. El endpoint "por área"
 * devuelve `null` cuando aún no se ha configurado, para que el frontend
 * distinga "no configurado" de un error real.
 *
 * providerId/model se validan contra el catálogo real del proveedor (vía
 * AIProvidersService) para no guardar una configuración que fallaría al
 * intentar usarse en tiempo real.
 */
@Injectable()
export class SpeakingPracticesService {
  constructor(
    private readonly speakingPracticesRepository: SpeakingPracticesRepository,
    private readonly protectedAreasService: ProtectedAreasService,
    private readonly aiProvidersService: AIProvidersService,
  ) {}

  async findByProtectedArea(
    protectedAreaId: string,
  ): Promise<SpeakingPracticeResponseDoc | null> {
    const areaExists =
      await this.protectedAreasService.existsById(protectedAreaId);

    if (!areaExists) {
      throw new NotFoundException('Área protegida no encontrada.');
    }

    const practice =
      await this.speakingPracticesRepository.findByProtectedAreaId(
        protectedAreaId,
      );

    return practice ? this.toResponseDoc(practice) : null;
  }

  async findByIdOrThrow(id: string): Promise<SpeakingPracticeResponseDoc> {
    const practice = await this.getPracticeOrThrow(id);

    return this.toResponseDoc(practice);
  }

  async create(
    dto: CreateSpeakingPracticeDto,
  ): Promise<SpeakingPracticeResponseDoc> {
    const areaExists = await this.protectedAreasService.existsById(
      dto.protectedAreaId,
    );

    if (!areaExists) {
      throw new NotFoundException('Área protegida no encontrada.');
    }

    const existing =
      await this.speakingPracticesRepository.findByProtectedAreaId(
        dto.protectedAreaId,
      );

    if (existing) {
      throw new ConflictException(
        'Esta área protegida ya tiene una práctica de speaking configurada. Edítala en vez de crear otra.',
      );
    }

    await this.validateProviderAndModel(dto.providerId, dto.model);

    const practice = await this.speakingPracticesRepository.create(dto);

    return this.toResponseDoc(practice);
  }

  async update(
    id: string,
    dto: UpdateSpeakingPracticeDto,
  ): Promise<SpeakingPracticeResponseDoc> {
    const existing = await this.getPracticeOrThrow(id);

    await this.validateProviderAndModel(
      dto.providerId ?? existing.providerId,
      dto.model ?? existing.model,
    );

    const updated = await this.speakingPracticesRepository.update(id, dto);

    return this.toResponseDoc(updated);
  }

  async deactivate(id: string): Promise<void> {
    await this.getPracticeOrThrow(id);
    await this.speakingPracticesRepository.deactivate(id);
  }

  /**
   * providerId debe existir/estar activo y model debe existir/estar activo
   * dentro del catálogo de ese proveedor — evita guardar una configuración
   * que AICompletionService rechazaría al momento de usarse de verdad.
   */
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

  private toResponseDoc(
    practice: SpeakingPractice,
  ): SpeakingPracticeResponseDoc {
    return plainToInstance(SpeakingPracticeResponseDoc, practice, {
      excludeExtraneousValues: true,
    });
  }

  private async getPracticeOrThrow(id: string): Promise<SpeakingPractice> {
    if (!OBJECT_ID_REGEX.test(id)) {
      throw new BadRequestException('El id proporcionado no es válido.');
    }

    const practice = await this.speakingPracticesRepository.findById(id);

    if (!practice) {
      throw new NotFoundException('Práctica de speaking no encontrada.');
    }

    return practice;
  }
}
