import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AIProviderType } from '@prisma/client';
import { AICompletionService } from '../services/ai-completion.service';
import { AIProvidersRepository } from '../repositories/ai-providers.repository';
import { ApiKeyEncryptionService } from '../services/api-key-encryption.service';
import { AIProviderStrategyFactory } from '../strategies/ai-provider-strategy.factory';
import { aiProvidersRepositoryMock } from './mocks/ai-providers-repository.mock';
import { apiKeyEncryptionServiceMock } from './mocks/api-key-encryption-service.mock';
import { aiProviderStrategyFactoryMock } from './mocks/ai-provider-strategy-factory.mock';

describe('AICompletionService', () => {
  let service: AICompletionService;

  const VALID_ID = '507f1f77bcf86cd799439011';

  const activeModel = {
    id: 'model-uuid-1',
    name: 'Gemini 1.5 Flash',
    model: 'gemini-1.5-flash',
    isActive: true,
  };

  const inactiveModel = {
    id: 'model-uuid-2',
    name: 'Gemini viejo',
    model: 'gemini-1.0-pro',
    isActive: false,
  };

  const baseProvider = {
    id: VALID_ID,
    providerName: 'Google Gemini',
    providerType: AIProviderType.GEMINI,
    apiKeyEncrypted: 'iv:tag:cipher',
    isActive: true,
    models: [activeModel, inactiveModel],
    createdAt: new Date(),
  };

  const baseRequest = {
    providerId: VALID_ID,
    model: 'gemini-1.5-flash',
    messages: [{ role: 'user' as const, content: 'Hola' }],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AICompletionService,
        { provide: AIProvidersRepository, useValue: aiProvidersRepositoryMock },
        {
          provide: ApiKeyEncryptionService,
          useValue: apiKeyEncryptionServiceMock,
        },
        {
          provide: AIProviderStrategyFactory,
          useValue: aiProviderStrategyFactoryMock,
        },
      ],
    }).compile();

    service = module.get(AICompletionService);
  });

  it('lanza NotFoundException si el proveedor no existe', async () => {
    aiProvidersRepositoryMock.findById.mockResolvedValue(null);

    await expect(service.complete(baseRequest)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lanza NotFoundException si el proveedor está inactivo', async () => {
    aiProvidersRepositoryMock.findById.mockResolvedValue({
      ...baseProvider,
      isActive: false,
    });

    await expect(service.complete(baseRequest)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lanza BadRequestException si el modelo no existe en el catálogo', async () => {
    aiProvidersRepositoryMock.findById.mockResolvedValue(baseProvider);

    await expect(
      service.complete({ ...baseRequest, model: 'no-existe' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('lanza BadRequestException si el modelo existe pero está inactivo', async () => {
    aiProvidersRepositoryMock.findById.mockResolvedValue(baseProvider);

    await expect(
      service.complete({ ...baseRequest, model: 'gemini-1.0-pro' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('descifra el apiKey, resuelve la estrategia por providerType y le delega la llamada', async () => {
    aiProvidersRepositoryMock.findById.mockResolvedValue(baseProvider);
    apiKeyEncryptionServiceMock.decrypt.mockReturnValue('sk-plain-text');
    const completeMock = jest.fn().mockResolvedValue({ content: 'Hola!' });
    aiProviderStrategyFactoryMock.getStrategy.mockReturnValue({
      complete: completeMock,
    });

    const result = await service.complete({
      ...baseRequest,
      temperature: 0.5,
      maxTokens: 256,
    });

    expect(apiKeyEncryptionServiceMock.decrypt).toHaveBeenCalledWith(
      'iv:tag:cipher',
    );
    expect(aiProviderStrategyFactoryMock.getStrategy).toHaveBeenCalledWith(
      AIProviderType.GEMINI,
    );
    expect(completeMock).toHaveBeenCalledWith({
      apiKey: 'sk-plain-text',
      model: 'gemini-1.5-flash',
      messages: baseRequest.messages,
      temperature: 0.5,
      maxTokens: 256,
    });
    expect(result).toEqual({ content: 'Hola!' });
  });
});
