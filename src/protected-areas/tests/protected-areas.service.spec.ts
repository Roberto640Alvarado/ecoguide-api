import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ProtectedAreasService } from '../services/protected-areas.service';
import { ProtectedAreasRepository } from '../repositories/protected-areas.repository';
import { protectedAreasRepositoryMock } from './mocks/protected-areas-repository.mock';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';

describe('ProtectedAreasService', () => {
  let service: ProtectedAreasService;

  const VALID_ID = '507f1f77bcf86cd799439011';

  const baseArea = {
    id: VALID_ID,
    name: 'Parque Nacional El Imposible',
    description: 'Reserva de bosque nuboso.',
    latitude: 13.8383,
    longitude: -89.9333,
    images: [],
    isPublished: true,
    createdBy: 'teacher-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const studentUser: AuthenticatedUser = {
    id: 'student-id',
    email: 's@a.com',
    role: UserRole.STUDENT,
  };

  const teacherUser: AuthenticatedUser = {
    id: 'teacher-id',
    email: 't@a.com',
    role: UserRole.TEACHER,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProtectedAreasService,
        {
          provide: ProtectedAreasRepository,
          useValue: protectedAreasRepositoryMock,
        },
      ],
    }).compile();

    service = module.get(ProtectedAreasService);
  });

  describe('findAll', () => {
    it('fuerza isPublished=true cuando el solicitante es STUDENT', async () => {
      protectedAreasRepositoryMock.findAll.mockResolvedValue({
        items: [baseArea],
        total: 1,
      });

      await service.findAll({ isPublished: false }, studentUser);

      expect(protectedAreasRepositoryMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ isPublished: true }),
      );
    });

    it('respeta el filtro isPublished cuando el solicitante es TEACHER', async () => {
      protectedAreasRepositoryMock.findAll.mockResolvedValue({
        items: [],
        total: 0,
      });

      await service.findAll({ isPublished: false }, teacherUser);

      expect(protectedAreasRepositoryMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ isPublished: false }),
      );
    });

    it('pagina y arma los meta correctamente', async () => {
      protectedAreasRepositoryMock.findAll.mockResolvedValue({
        items: [baseArea],
        total: 25,
      });

      const result = await service.findAll({ page: 2, limit: 10 }, teacherUser);

      expect(result.items).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
    });
  });

  describe('findByIdOrThrow', () => {
    it('lanza BadRequestException si el id no es un ObjectId válido', async () => {
      await expect(
        service.findByIdOrThrow('no-valido', teacherUser),
      ).rejects.toThrow(BadRequestException);
      expect(protectedAreasRepositoryMock.findById).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el área no existe', async () => {
      protectedAreasRepositoryMock.findById.mockResolvedValue(null);

      await expect(
        service.findByIdOrThrow(VALID_ID, teacherUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si el área no está publicada y el solicitante es STUDENT', async () => {
      protectedAreasRepositoryMock.findById.mockResolvedValue({
        ...baseArea,
        isPublished: false,
      });

      await expect(
        service.findByIdOrThrow(VALID_ID, studentUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('retorna el área no publicada si el solicitante es TEACHER', async () => {
      protectedAreasRepositoryMock.findById.mockResolvedValue({
        ...baseArea,
        isPublished: false,
      });

      const result = await service.findByIdOrThrow(VALID_ID, teacherUser);

      expect(result.id).toBe(VALID_ID);
    });

    it('retorna el área publicada al solicitante STUDENT', async () => {
      protectedAreasRepositoryMock.findById.mockResolvedValue(baseArea);

      const result = await service.findByIdOrThrow(VALID_ID, studentUser);

      expect(result.id).toBe(VALID_ID);
    });
  });

  describe('create', () => {
    it('crea el área asignando createdBy desde el usuario autenticado', async () => {
      protectedAreasRepositoryMock.create.mockResolvedValue(baseArea);

      await service.create(
        {
          name: baseArea.name,
          description: baseArea.description,
          latitude: baseArea.latitude,
          longitude: baseArea.longitude,
        },
        'teacher-id',
      );

      expect(protectedAreasRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: 'teacher-id' }),
      );
    });
  });

  describe('update', () => {
    it('lanza NotFoundException si el área no existe', async () => {
      protectedAreasRepositoryMock.findById.mockResolvedValue(null);

      await expect(
        service.update(VALID_ID, { name: 'Nuevo nombre' }),
      ).rejects.toThrow(NotFoundException);
      expect(protectedAreasRepositoryMock.update).not.toHaveBeenCalled();
    });

    it('actualiza y retorna el área serializada', async () => {
      protectedAreasRepositoryMock.findById.mockResolvedValue(baseArea);
      protectedAreasRepositoryMock.update.mockResolvedValue({
        ...baseArea,
        name: 'Nuevo nombre',
      });

      const result = await service.update(VALID_ID, {
        name: 'Nuevo nombre',
      });

      expect(result.name).toBe('Nuevo nombre');
    });
  });

  describe('remove', () => {
    it('lanza NotFoundException si el área no existe', async () => {
      protectedAreasRepositoryMock.findById.mockResolvedValue(null);

      await expect(service.remove(VALID_ID)).rejects.toThrow(NotFoundException);
      expect(protectedAreasRepositoryMock.unpublish).not.toHaveBeenCalled();
    });

    it('despublica el área existente', async () => {
      protectedAreasRepositoryMock.findById.mockResolvedValue(baseArea);

      await service.remove(VALID_ID);

      expect(protectedAreasRepositoryMock.unpublish).toHaveBeenCalledWith(
        VALID_ID,
      );
    });
  });
});
