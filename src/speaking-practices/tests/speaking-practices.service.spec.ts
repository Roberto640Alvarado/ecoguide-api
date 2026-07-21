import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { SpeakingPracticesService } from '../services/speaking-practices.service';
import { SpeakingPracticesRepository } from '../repositories/speaking-practices.repository';
import { ProtectedAreasService } from '../../protected-areas/services/protected-areas.service';
import { AIProvidersService } from '../../ai-providers/services/ai-providers.service';
import { speakingPracticesRepositoryMock } from './mocks/speaking-practices-repository.mock';
import { protectedAreasServiceMock } from './mocks/protected-areas-service.mock';
import { aiProvidersServiceMock } from './mocks/ai-providers-service.mock';

describe('SpeakingPracticesService', () => {
  let service: SpeakingPracticesService;

  const VALID_ID = '507f1f77bcf86cd799439011';
  const AREA_ID = '507f1f77bcf86cd799439022';
  const PROVIDER_ID = '507f1f77bcf86cd799439033';

  const basePractice = {
    id: VALID_ID,
    protectedAreaId: AREA_ID,
    title: 'Describe el bosque nuboso',
    instructions: 'Habla durante un minuto sobre lo que observas.',
    providerId: PROVIDER_ID,
    model: 'gemini-1.5-flash',
    prompt: 'Eres un evaluador de speaking...',
    isActive: true,
    createdAt: new Date(),
  };

  const activeProvider = {
    id: PROVIDER_ID,
    providerName: 'Google Gemini',
    isActive: true,
    models: [
      {
        id: 'm1',
        name: 'Gemini 1.5 Flash',
        model: 'gemini-1.5-flash',
        isActive: true,
      },
      { id: 'm2', name: 'Viejo', model: 'gemini-1.0', isActive: false },
    ],
  };

  const baseDto = {
    protectedAreaId: AREA_ID,
    title: 'Describe el bosque nuboso',
    instructions: 'Habla durante un minuto sobre lo que observas.',
    providerId: PROVIDER_ID,
    model: 'gemini-1.5-flash',
    prompt: 'Eres un evaluador de speaking...',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpeakingPracticesService,
        {
          provide: SpeakingPracticesRepository,
          useValue: speakingPracticesRepositoryMock,
        },
        { provide: ProtectedAreasService, useValue: protectedAreasServiceMock },
        { provide: AIProvidersService, useValue: aiProvidersServiceMock },
      ],
    }).compile();

    service = module.get(SpeakingPracticesService);
  });

  describe('findByProtectedArea', () => {
    it('lanza NotFoundException si el área no existe', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(false);

      await expect(service.findByProtectedArea(AREA_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('retorna null si el área existe pero no tiene práctica configurada', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(true);
      speakingPracticesRepositoryMock.findByProtectedAreaId.mockResolvedValue(
        null,
      );

      const result = await service.findByProtectedArea(AREA_ID);

      expect(result).toBeNull();
    });

    it('retorna la práctica serializada si existe', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(true);
      speakingPracticesRepositoryMock.findByProtectedAreaId.mockResolvedValue(
        basePractice,
      );

      const result = await service.findByProtectedArea(AREA_ID);

      expect(result?.title).toBe('Describe el bosque nuboso');
    });
  });

  describe('create', () => {
    it('lanza NotFoundException si el área no existe', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(false);

      await expect(service.create(baseDto)).rejects.toThrow(NotFoundException);
      expect(speakingPracticesRepositoryMock.create).not.toHaveBeenCalled();
    });

    it('lanza ConflictException si el área ya tiene una práctica', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(true);
      speakingPracticesRepositoryMock.findByProtectedAreaId.mockResolvedValue(
        basePractice,
      );

      await expect(service.create(baseDto)).rejects.toThrow(ConflictException);
      expect(speakingPracticesRepositoryMock.create).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si el modelo no existe/está inactivo en el proveedor', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(true);
      speakingPracticesRepositoryMock.findByProtectedAreaId.mockResolvedValue(
        null,
      );
      aiProvidersServiceMock.findByIdOrThrow.mockResolvedValue(activeProvider);

      await expect(
        service.create({ ...baseDto, model: 'gemini-1.0' }),
      ).rejects.toThrow(BadRequestException);
      expect(speakingPracticesRepositoryMock.create).not.toHaveBeenCalled();
    });

    it('crea la práctica cuando todo es válido', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(true);
      speakingPracticesRepositoryMock.findByProtectedAreaId.mockResolvedValue(
        null,
      );
      aiProvidersServiceMock.findByIdOrThrow.mockResolvedValue(activeProvider);
      speakingPracticesRepositoryMock.create.mockResolvedValue(basePractice);

      const result = await service.create(baseDto);

      expect(speakingPracticesRepositoryMock.create).toHaveBeenCalledWith(
        baseDto,
      );
      expect(result.id).toBe(VALID_ID);
    });
  });

  describe('update', () => {
    it('lanza NotFoundException si la práctica no existe', async () => {
      speakingPracticesRepositoryMock.findById.mockResolvedValue(null);

      await expect(
        service.update(VALID_ID, { title: 'Nuevo' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('revalida providerId/model existentes al actualizar solo el título', async () => {
      speakingPracticesRepositoryMock.findById.mockResolvedValue(basePractice);
      aiProvidersServiceMock.findByIdOrThrow.mockResolvedValue(activeProvider);
      speakingPracticesRepositoryMock.update.mockResolvedValue(basePractice);

      await service.update(VALID_ID, { title: 'Nuevo título' });

      expect(aiProvidersServiceMock.findByIdOrThrow).toHaveBeenCalledWith(
        PROVIDER_ID,
      );
    });
  });

  describe('deactivate', () => {
    it('lanza NotFoundException si la práctica no existe', async () => {
      speakingPracticesRepositoryMock.findById.mockResolvedValue(null);

      await expect(service.deactivate(VALID_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('desactiva la práctica existente', async () => {
      speakingPracticesRepositoryMock.findById.mockResolvedValue(basePractice);

      await service.deactivate(VALID_ID);

      expect(speakingPracticesRepositoryMock.deactivate).toHaveBeenCalledWith(
        VALID_ID,
      );
    });
  });
});
