import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ChatbotConfigsService } from '../services/chatbot-configs.service';
import { ChatbotConfigsRepository } from '../repositories/chatbot-configs.repository';
import { ProtectedAreasService } from '../../protected-areas/services/protected-areas.service';
import { AIProvidersService } from '../../ai-providers/services/ai-providers.service';
import { chatbotConfigsRepositoryMock } from './mocks/chatbot-configs-repository.mock';
import { protectedAreasServiceMock } from './mocks/protected-areas-service.mock';
import { aiProvidersServiceMock } from './mocks/ai-providers-service.mock';

describe('ChatbotConfigsService', () => {
  let service: ChatbotConfigsService;

  const VALID_ID = '507f1f77bcf86cd799439011';
  const AREA_ID = '507f1f77bcf86cd799439022';
  const PROVIDER_ID = '507f1f77bcf86cd799439033';

  const baseConfig = {
    id: VALID_ID,
    protectedAreaId: AREA_ID,
    providerId: PROVIDER_ID,
    model: 'gemini-1.5-flash',
    systemPrompt: 'Eres un guía turístico virtual...',
    welcomeMessage: '¡Hola! ¿Qué quieres saber de esta área?',
    temperature: 0.7,
    maxTokens: 2048,
    isActive: true,
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
    providerId: PROVIDER_ID,
    model: 'gemini-1.5-flash',
    systemPrompt: 'Eres un guía turístico virtual...',
    welcomeMessage: '¡Hola! ¿Qué quieres saber de esta área?',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotConfigsService,
        {
          provide: ChatbotConfigsRepository,
          useValue: chatbotConfigsRepositoryMock,
        },
        { provide: ProtectedAreasService, useValue: protectedAreasServiceMock },
        { provide: AIProvidersService, useValue: aiProvidersServiceMock },
      ],
    }).compile();

    service = module.get(ChatbotConfigsService);
  });

  describe('findByProtectedArea', () => {
    it('lanza NotFoundException si el área no existe', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(false);

      await expect(service.findByProtectedArea(AREA_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('retorna null si el área existe pero no tiene chatbot configurado', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(true);
      chatbotConfigsRepositoryMock.findByProtectedAreaId.mockResolvedValue(
        null,
      );

      const result = await service.findByProtectedArea(AREA_ID);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('lanza ConflictException si el área ya tiene chatbot configurado', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(true);
      chatbotConfigsRepositoryMock.findByProtectedAreaId.mockResolvedValue(
        baseConfig,
      );

      await expect(service.create(baseDto)).rejects.toThrow(ConflictException);
      expect(chatbotConfigsRepositoryMock.create).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si el modelo no existe/está inactivo', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(true);
      chatbotConfigsRepositoryMock.findByProtectedAreaId.mockResolvedValue(
        null,
      );
      aiProvidersServiceMock.findByIdOrThrow.mockResolvedValue(activeProvider);

      await expect(
        service.create({ ...baseDto, model: 'gemini-1.0' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('crea la config cuando todo es válido', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(true);
      chatbotConfigsRepositoryMock.findByProtectedAreaId.mockResolvedValue(
        null,
      );
      aiProvidersServiceMock.findByIdOrThrow.mockResolvedValue(activeProvider);
      chatbotConfigsRepositoryMock.create.mockResolvedValue(baseConfig);

      const result = await service.create(baseDto);

      expect(chatbotConfigsRepositoryMock.create).toHaveBeenCalledWith(baseDto);
      expect(result.id).toBe(VALID_ID);
    });
  });

  describe('update', () => {
    it('lanza NotFoundException si la config no existe', async () => {
      chatbotConfigsRepositoryMock.findById.mockResolvedValue(null);

      await expect(
        service.update(VALID_ID, { welcomeMessage: 'Hola' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('desactiva la config existente', async () => {
      chatbotConfigsRepositoryMock.findById.mockResolvedValue(baseConfig);

      await service.deactivate(VALID_ID);

      expect(chatbotConfigsRepositoryMock.deactivate).toHaveBeenCalledWith(
        VALID_ID,
      );
    });
  });
});
