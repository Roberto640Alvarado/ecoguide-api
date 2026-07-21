import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FlashCardType } from '@prisma/client';
import { FlashCardsService } from '../services/flash-cards.service';
import { FlashCardsRepository } from '../repositories/flash-cards.repository';
import { ProtectedAreasService } from '../../protected-areas/services/protected-areas.service';
import { flashCardsRepositoryMock } from './mocks/flash-cards-repository.mock';
import { protectedAreasServiceMock } from './mocks/protected-areas-service.mock';

describe('FlashCardsService', () => {
  let service: FlashCardsService;

  const VALID_ID = '507f1f77bcf86cd799439011';
  const VALID_AREA_ID = '507f1f77bcf86cd799439022';

  const baseCard = {
    id: VALID_ID,
    protectedAreaId: VALID_AREA_ID,
    type: FlashCardType.VOCABULARY,
    title: 'Bosque nuboso',
    content: 'Vocabulario relacionado al bosque nuboso.',
    image: null,
    order: 1,
    question: null,
    options: [],
    correctAnswer: null,
    createdAt: new Date(),
  };

  const environmentalCard = {
    ...baseCard,
    type: FlashCardType.ENVIRONMENTAL,
    question: '¿Cuál es la temperatura promedio?',
    options: ['15°C', '20°C', '25°C'],
    correctAnswer: '20°C',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlashCardsService,
        { provide: FlashCardsRepository, useValue: flashCardsRepositoryMock },
        { provide: ProtectedAreasService, useValue: protectedAreasServiceMock },
      ],
    }).compile();

    service = module.get(FlashCardsService);
  });

  describe('findAllByArea', () => {
    it('lanza NotFoundException si el área protegida no existe', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(false);

      await expect(
        service.findAllByArea({ protectedAreaId: VALID_AREA_ID }),
      ).rejects.toThrow(NotFoundException);
      expect(flashCardsRepositoryMock.findAll).not.toHaveBeenCalled();
    });

    it('pagina y arma los meta correctamente cuando el área existe', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(true);
      flashCardsRepositoryMock.findAll.mockResolvedValue({
        items: [baseCard],
        total: 15,
      });

      const result = await service.findAllByArea({
        protectedAreaId: VALID_AREA_ID,
        page: 2,
        limit: 5,
      });

      expect(flashCardsRepositoryMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          protectedAreaId: VALID_AREA_ID,
          page: 2,
          limit: 5,
          sortField: 'order',
          sortOrder: 'desc',
        }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 15,
        page: 2,
        limit: 5,
        totalPages: 3,
      });
    });
  });

  describe('findByIdOrThrow', () => {
    it('lanza BadRequestException si el id no es un ObjectId válido', async () => {
      await expect(service.findByIdOrThrow('no-valido')).rejects.toThrow(
        BadRequestException,
      );
      expect(flashCardsRepositoryMock.findById).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si la flashcard no existe', async () => {
      flashCardsRepositoryMock.findById.mockResolvedValue(null);

      await expect(service.findByIdOrThrow(VALID_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('retorna la flashcard serializada', async () => {
      flashCardsRepositoryMock.findById.mockResolvedValue(baseCard);

      const result = await service.findByIdOrThrow(VALID_ID);

      expect(result.id).toBe(VALID_ID);
    });
  });

  describe('create', () => {
    it('lanza NotFoundException si el área protegida no existe', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(false);

      await expect(
        service.create({
          protectedAreaId: VALID_AREA_ID,
          type: FlashCardType.VOCABULARY,
          title: 'Título',
          content: 'Contenido',
          order: 1,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(flashCardsRepositoryMock.create).not.toHaveBeenCalled();
    });

    it('crea sin problema una flashcard de tipo no-ENVIRONMENTAL sin question/options', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(true);
      flashCardsRepositoryMock.create.mockResolvedValue(baseCard);

      await service.create({
        protectedAreaId: VALID_AREA_ID,
        type: FlashCardType.VOCABULARY,
        title: 'Título',
        content: 'Contenido',
        order: 1,
      });

      expect(flashCardsRepositoryMock.create).toHaveBeenCalled();
    });

    it('lanza BadRequestException si ENVIRONMENTAL no trae question', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(true);

      await expect(
        service.create({
          protectedAreaId: VALID_AREA_ID,
          type: FlashCardType.ENVIRONMENTAL,
          title: 'Título',
          content: 'Contenido',
          order: 1,
          options: ['a', 'b'],
          correctAnswer: 'a',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(flashCardsRepositoryMock.create).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si ENVIRONMENTAL trae menos de 2 opciones', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(true);

      await expect(
        service.create({
          protectedAreaId: VALID_AREA_ID,
          type: FlashCardType.ENVIRONMENTAL,
          title: 'Título',
          content: 'Contenido',
          order: 1,
          question: '¿Pregunta?',
          options: ['a'],
          correctAnswer: 'a',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si correctAnswer no está entre las opciones', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(true);

      await expect(
        service.create({
          protectedAreaId: VALID_AREA_ID,
          type: FlashCardType.ENVIRONMENTAL,
          title: 'Título',
          content: 'Contenido',
          order: 1,
          question: '¿Pregunta?',
          options: ['a', 'b'],
          correctAnswer: 'c',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(flashCardsRepositoryMock.create).not.toHaveBeenCalled();
    });

    it('auto-asigna order según el rango de la categoría cuando no se envía uno', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(true);
      flashCardsRepositoryMock.countByAreaAndType.mockResolvedValue(2);
      flashCardsRepositoryMock.create.mockResolvedValue(baseCard);

      await service.create({
        protectedAreaId: VALID_AREA_ID,
        type: FlashCardType.FLORA_FAUNA,
        title: 'Título',
        content: 'Contenido',
      } as never);

      expect(flashCardsRepositoryMock.countByAreaAndType).toHaveBeenCalledWith(
        VALID_AREA_ID,
        FlashCardType.FLORA_FAUNA,
      );
      // FLORA_FAUNA tiene rango 2 → 2 * 1000 + 2 existentes + 1 = 2003.
      expect(flashCardsRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ order: 2003 }),
      );
    });

    it('respeta el order explícito si se envía', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(true);
      flashCardsRepositoryMock.create.mockResolvedValue(baseCard);

      await service.create({
        protectedAreaId: VALID_AREA_ID,
        type: FlashCardType.VOCABULARY,
        title: 'Título',
        content: 'Contenido',
        order: 42,
      });

      expect(flashCardsRepositoryMock.countByAreaAndType).not.toHaveBeenCalled();
      expect(flashCardsRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ order: 42 }),
      );
    });

    it('crea una flashcard ENVIRONMENTAL válida', async () => {
      protectedAreasServiceMock.existsById.mockResolvedValue(true);
      flashCardsRepositoryMock.create.mockResolvedValue(environmentalCard);

      const result = await service.create({
        protectedAreaId: VALID_AREA_ID,
        type: FlashCardType.ENVIRONMENTAL,
        title: 'Título',
        content: 'Contenido',
        order: 1,
        question: '¿Cuál es la temperatura promedio?',
        options: ['15°C', '20°C', '25°C'],
        correctAnswer: '20°C',
      });

      expect(result.correctAnswer).toBe('20°C');
    });
  });

  describe('update', () => {
    it('lanza NotFoundException si la flashcard no existe', async () => {
      flashCardsRepositoryMock.findById.mockResolvedValue(null);

      await expect(
        service.update(VALID_ID, { title: 'Nuevo' }),
      ).rejects.toThrow(NotFoundException);
      expect(flashCardsRepositoryMock.update).not.toHaveBeenCalled();
    });

    it('permite editar campos ajenos sin romper la validación ENVIRONMENTAL existente', async () => {
      flashCardsRepositoryMock.findById.mockResolvedValue(environmentalCard);
      flashCardsRepositoryMock.update.mockResolvedValue({
        ...environmentalCard,
        title: 'Nuevo título',
      });

      const result = await service.update(VALID_ID, {
        title: 'Nuevo título',
      });

      expect(result.title).toBe('Nuevo título');
    });

    it('lanza BadRequestException si al editar una ENVIRONMENTAL el nuevo correctAnswer no está en options', async () => {
      flashCardsRepositoryMock.findById.mockResolvedValue(environmentalCard);

      await expect(
        service.update(VALID_ID, { correctAnswer: 'no-existe' }),
      ).rejects.toThrow(BadRequestException);
      expect(flashCardsRepositoryMock.update).not.toHaveBeenCalled();
    });

    it('recalcula order si cambia de categoría y no se envía uno explícito', async () => {
      flashCardsRepositoryMock.findById.mockResolvedValue(baseCard); // VOCABULARY
      flashCardsRepositoryMock.countByAreaAndType.mockResolvedValue(0);
      flashCardsRepositoryMock.update.mockResolvedValue({
        ...baseCard,
        type: FlashCardType.WELCOME,
      });

      await service.update(VALID_ID, { type: FlashCardType.WELCOME });

      expect(flashCardsRepositoryMock.countByAreaAndType).toHaveBeenCalledWith(
        VALID_AREA_ID,
        FlashCardType.WELCOME,
      );
      // WELCOME tiene rango 0 → 0 * 1000 + 0 existentes + 1 = 1.
      expect(flashCardsRepositoryMock.update).toHaveBeenCalledWith(
        VALID_ID,
        expect.objectContaining({ order: 1 }),
      );
    });

    it('no toca order si el type no cambia', async () => {
      flashCardsRepositoryMock.findById.mockResolvedValue(baseCard);
      flashCardsRepositoryMock.update.mockResolvedValue(baseCard);

      await service.update(VALID_ID, { title: 'Nuevo' });

      expect(flashCardsRepositoryMock.countByAreaAndType).not.toHaveBeenCalled();
      expect(flashCardsRepositoryMock.update).toHaveBeenCalledWith(VALID_ID, {
        title: 'Nuevo',
      });
    });
  });

  describe('remove', () => {
    it('lanza NotFoundException si la flashcard no existe', async () => {
      flashCardsRepositoryMock.findById.mockResolvedValue(null);

      await expect(service.remove(VALID_ID)).rejects.toThrow(NotFoundException);
      expect(flashCardsRepositoryMock.remove).not.toHaveBeenCalled();
    });

    it('elimina la flashcard existente', async () => {
      flashCardsRepositoryMock.findById.mockResolvedValue(baseCard);

      await service.remove(VALID_ID);

      expect(flashCardsRepositoryMock.remove).toHaveBeenCalledWith(VALID_ID);
    });
  });
});
