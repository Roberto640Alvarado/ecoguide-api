import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AIProviderType } from '@prisma/client';
import { AIProvidersService } from '../services/ai-providers.service';
import { AIProvidersRepository } from '../repositories/ai-providers.repository';
import { ApiKeyEncryptionService } from '../services/api-key-encryption.service';
import { aiProvidersRepositoryMock } from './mocks/ai-providers-repository.mock';
import { apiKeyEncryptionServiceMock } from './mocks/api-key-encryption-service.mock';

describe('AIProvidersService', () => {
  let service: AIProvidersService;

  const VALID_ID = '507f1f77bcf86cd799439011';

  const baseModel = {
    id: 'model-uuid-1',
    name: 'Gemini 1.5 Flash',
    model: 'gemini-1.5-flash',
    isActive: true,
  };

  const baseProvider = {
    id: VALID_ID,
    providerName: 'Google Gemini',
    providerType: AIProviderType.GEMINI,
    apiKeyEncrypted: 'iv:tag:cipher',
    isActive: true,
    models: [baseModel],
    createdAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIProvidersService,
        {
          provide: AIProvidersRepository,
          useValue: aiProvidersRepositoryMock,
        },
        {
          provide: ApiKeyEncryptionService,
          useValue: apiKeyEncryptionServiceMock,
        },
      ],
    }).compile();

    service = module.get(AIProvidersService);
  });

  describe('findAll', () => {
    it('pagina, serializa y nunca expone apiKeyEncrypted', async () => {
      aiProvidersRepositoryMock.findAll.mockResolvedValue({
        items: [baseProvider],
        total: 3,
      });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(
        (result.items[0] as unknown as { apiKeyEncrypted?: string })
          .apiKeyEncrypted,
      ).toBeUndefined();
      expect(result.meta).toEqual({
        total: 3,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('findByIdOrThrow', () => {
    it('lanza BadRequestException si el id no es un ObjectId válido', async () => {
      await expect(service.findByIdOrThrow('no-valido')).rejects.toThrow(
        BadRequestException,
      );
      expect(aiProvidersRepositoryMock.findById).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el proveedor no existe', async () => {
      aiProvidersRepositoryMock.findById.mockResolvedValue(null);

      await expect(service.findByIdOrThrow(VALID_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('retorna el proveedor serializado sin apiKeyEncrypted', async () => {
      aiProvidersRepositoryMock.findById.mockResolvedValue(baseProvider);

      const result = await service.findByIdOrThrow(VALID_ID);

      expect(result.providerName).toBe('Google Gemini');
      expect(
        (result as unknown as { apiKeyEncrypted?: string }).apiKeyEncrypted,
      ).toBeUndefined();
    });
  });

  describe('create', () => {
    it('lanza ConflictException si el providerName ya existe', async () => {
      aiProvidersRepositoryMock.findByProviderName.mockResolvedValue(
        baseProvider,
      );

      await expect(
        service.create({
          providerName: 'Google Gemini',
          providerType: AIProviderType.GEMINI,
          apiKey: 'sk-123',
        }),
      ).rejects.toThrow(ConflictException);
      expect(aiProvidersRepositoryMock.create).not.toHaveBeenCalled();
    });

    it('cifra el apiKey antes de guardar y nunca envía el texto plano al repositorio', async () => {
      aiProvidersRepositoryMock.findByProviderName.mockResolvedValue(null);
      apiKeyEncryptionServiceMock.encrypt.mockReturnValue('iv:tag:cipher');
      aiProvidersRepositoryMock.create.mockResolvedValue(baseProvider);

      await service.create({
        providerName: 'Google Gemini',
        providerType: AIProviderType.GEMINI,
        apiKey: 'sk-123',
      });

      expect(apiKeyEncryptionServiceMock.encrypt).toHaveBeenCalledWith(
        'sk-123',
      );
      const createArg = aiProvidersRepositoryMock.create.mock.calls[0][0];
      expect(createArg.apiKeyEncrypted).toBe('iv:tag:cipher');
      expect(createArg.apiKey).toBeUndefined();
    });

    it('genera un id para cada modelo inicial', async () => {
      aiProvidersRepositoryMock.findByProviderName.mockResolvedValue(null);
      apiKeyEncryptionServiceMock.encrypt.mockReturnValue('iv:tag:cipher');
      aiProvidersRepositoryMock.create.mockResolvedValue(baseProvider);

      await service.create({
        providerName: 'Google Gemini',
        providerType: AIProviderType.GEMINI,
        apiKey: 'sk-123',
        models: [{ name: 'Gemini 1.5 Flash', model: 'gemini-1.5-flash' }],
      });

      const createArg = aiProvidersRepositoryMock.create.mock.calls[0][0];
      expect(createArg.models).toHaveLength(1);
      expect(createArg.models[0].id).toEqual(expect.any(String));
      expect(createArg.models[0].isActive).toBe(true);
    });
  });

  describe('update', () => {
    it('lanza NotFoundException si el proveedor no existe', async () => {
      aiProvidersRepositoryMock.findById.mockResolvedValue(null);

      await expect(
        service.update(VALID_ID, { providerName: 'Otro' }),
      ).rejects.toThrow(NotFoundException);
      expect(aiProvidersRepositoryMock.update).not.toHaveBeenCalled();
    });

    it('lanza ConflictException si el nuevo providerName lo usa otro proveedor', async () => {
      aiProvidersRepositoryMock.findById.mockResolvedValue(baseProvider);
      aiProvidersRepositoryMock.findByProviderName.mockResolvedValue({
        ...baseProvider,
        id: 'otro-id',
      });

      await expect(
        service.update(VALID_ID, { providerName: 'Groq' }),
      ).rejects.toThrow(ConflictException);
      expect(aiProvidersRepositoryMock.update).not.toHaveBeenCalled();
    });

    it('no reenvía apiKeyEncrypted si no se manda un nuevo apiKey', async () => {
      aiProvidersRepositoryMock.findById.mockResolvedValue(baseProvider);
      aiProvidersRepositoryMock.update.mockResolvedValue(baseProvider);

      await service.update(VALID_ID, { isActive: false });

      const updateArg = aiProvidersRepositoryMock.update.mock.calls[0][1];
      expect(updateArg.apiKeyEncrypted).toBeUndefined();
      expect(apiKeyEncryptionServiceMock.encrypt).not.toHaveBeenCalled();
    });

    it('re-cifra el apiKey cuando se proporciona uno nuevo', async () => {
      aiProvidersRepositoryMock.findById.mockResolvedValue(baseProvider);
      apiKeyEncryptionServiceMock.encrypt.mockReturnValue(
        'new-iv:new-tag:new-cipher',
      );
      aiProvidersRepositoryMock.update.mockResolvedValue(baseProvider);

      await service.update(VALID_ID, { apiKey: 'sk-nuevo' });

      expect(apiKeyEncryptionServiceMock.encrypt).toHaveBeenCalledWith(
        'sk-nuevo',
      );
      const updateArg = aiProvidersRepositoryMock.update.mock.calls[0][1];
      expect(updateArg.apiKeyEncrypted).toBe('new-iv:new-tag:new-cipher');
    });
  });

  describe('deactivate', () => {
    it('lanza NotFoundException si el proveedor no existe', async () => {
      aiProvidersRepositoryMock.findById.mockResolvedValue(null);

      await expect(service.deactivate(VALID_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(aiProvidersRepositoryMock.deactivate).not.toHaveBeenCalled();
    });

    it('desactiva el proveedor existente', async () => {
      aiProvidersRepositoryMock.findById.mockResolvedValue(baseProvider);

      await service.deactivate(VALID_ID);

      expect(aiProvidersRepositoryMock.deactivate).toHaveBeenCalledWith(
        VALID_ID,
      );
    });
  });

  describe('addModel', () => {
    it('lanza NotFoundException si el proveedor no existe', async () => {
      aiProvidersRepositoryMock.findById.mockResolvedValue(null);

      await expect(
        service.addModel(VALID_ID, { name: 'X', model: 'x-1' }),
      ).rejects.toThrow(NotFoundException);
      expect(aiProvidersRepositoryMock.addModel).not.toHaveBeenCalled();
    });

    it('agrega el modelo con un id generado', async () => {
      aiProvidersRepositoryMock.findById.mockResolvedValue(baseProvider);
      aiProvidersRepositoryMock.addModel.mockResolvedValue(baseProvider);

      await service.addModel(VALID_ID, {
        name: 'Groq Llama',
        model: 'llama-3',
      });

      const [, modelArg] = aiProvidersRepositoryMock.addModel.mock.calls[0];
      expect(modelArg.id).toEqual(expect.any(String));
      expect(modelArg.name).toBe('Groq Llama');
      expect(modelArg.isActive).toBe(true);
    });
  });

  describe('updateModel', () => {
    it('lanza NotFoundException si el proveedor no existe', async () => {
      aiProvidersRepositoryMock.findById.mockResolvedValue(null);

      await expect(
        service.updateModel(VALID_ID, 'model-uuid-1', { isActive: false }),
      ).rejects.toThrow(NotFoundException);
      expect(aiProvidersRepositoryMock.updateModel).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el modelo no pertenece al proveedor', async () => {
      aiProvidersRepositoryMock.findById.mockResolvedValue(baseProvider);

      await expect(
        service.updateModel(VALID_ID, 'no-existe', { isActive: false }),
      ).rejects.toThrow(NotFoundException);
      expect(aiProvidersRepositoryMock.updateModel).not.toHaveBeenCalled();
    });

    it('actualiza el modelo existente', async () => {
      aiProvidersRepositoryMock.findById.mockResolvedValue(baseProvider);
      aiProvidersRepositoryMock.updateModel.mockResolvedValue(baseProvider);

      await service.updateModel(VALID_ID, 'model-uuid-1', {
        isActive: false,
      });

      expect(aiProvidersRepositoryMock.updateModel).toHaveBeenCalledWith(
        VALID_ID,
        'model-uuid-1',
        { isActive: false },
      );
    });
  });

  describe('removeModel', () => {
    it('lanza NotFoundException si el modelo no pertenece al proveedor', async () => {
      aiProvidersRepositoryMock.findById.mockResolvedValue(baseProvider);

      await expect(service.removeModel(VALID_ID, 'no-existe')).rejects.toThrow(
        NotFoundException,
      );
      expect(aiProvidersRepositoryMock.removeModel).not.toHaveBeenCalled();
    });

    it('elimina el modelo existente', async () => {
      aiProvidersRepositoryMock.findById.mockResolvedValue(baseProvider);
      aiProvidersRepositoryMock.removeModel.mockResolvedValue(baseProvider);

      await service.removeModel(VALID_ID, 'model-uuid-1');

      expect(aiProvidersRepositoryMock.removeModel).toHaveBeenCalledWith(
        VALID_ID,
        'model-uuid-1',
      );
    });
  });

  describe('getDecryptedApiKey', () => {
    it('lanza NotFoundException si el proveedor no existe', async () => {
      aiProvidersRepositoryMock.findById.mockResolvedValue(null);

      await expect(service.getDecryptedApiKey(VALID_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('descifra y retorna el apiKey', async () => {
      aiProvidersRepositoryMock.findById.mockResolvedValue(baseProvider);
      apiKeyEncryptionServiceMock.decrypt.mockReturnValue('sk-123');

      const result = await service.getDecryptedApiKey(VALID_ID);

      expect(apiKeyEncryptionServiceMock.decrypt).toHaveBeenCalledWith(
        'iv:tag:cipher',
      );
      expect(result).toBe('sk-123');
    });
  });
});
