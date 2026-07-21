import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from '../services/users.service';
import { UsersRepository } from '../repositories/users.repository';
import { usersRepositoryMock } from './mocks/users-repository.mock';

describe('UsersService', () => {
  let service: UsersService;

  const VALID_ID = '507f1f77bcf86cd799439011';

  const baseUser = {
    id: VALID_ID,
    name: 'Ana',
    lastName: 'Pérez',
    email: 'a@a.com',
    password: 'hashed',
    role: UserRole.STUDENT,
    isActive: true,
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: usersRepositoryMock },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('create', () => {
    it('lanza ConflictException si el correo ya existe', async () => {
      usersRepositoryMock.findByEmail.mockResolvedValue({
        id: '1',
        email: 'a@a.com',
      });

      await expect(
        service.create({
          name: 'Ana',
          lastName: 'Pérez',
          email: 'a@a.com',
          password: 'Secret123',
          role: UserRole.STUDENT,
        }),
      ).rejects.toThrow(ConflictException);

      expect(usersRepositoryMock.create).not.toHaveBeenCalled();
    });

    it('hashea el password antes de crear el usuario', async () => {
      usersRepositoryMock.findByEmail.mockResolvedValue(null);
      usersRepositoryMock.create.mockImplementation((data) =>
        Promise.resolve({ id: '1', ...data }),
      );

      await service.create({
        name: 'Ana',
        lastName: 'Pérez',
        email: 'A@A.com',
        password: 'Secret123',
        role: UserRole.STUDENT,
      });

      const createArg = usersRepositoryMock.create.mock.calls[0][0];
      expect(createArg.email).toBe('a@a.com');
      expect(createArg.password).not.toBe('Secret123');
      expect(createArg.password.length).toBeGreaterThan(20);
    });
  });

  describe('validatePassword', () => {
    it('retorna true cuando el password coincide con el hash', async () => {
      usersRepositoryMock.findByEmail.mockResolvedValue(null);
      usersRepositoryMock.create.mockImplementation((data) =>
        Promise.resolve({ id: '1', ...data }),
      );

      const created = await service.create({
        name: 'Ana',
        lastName: 'Pérez',
        email: 'a@a.com',
        password: 'Secret123',
        role: UserRole.STUDENT,
      });

      const isValid = await service.validatePassword(
        'Secret123',
        created.password,
      );
      const isInvalid = await service.validatePassword(
        'WrongPass1',
        created.password,
      );

      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });
  });

  describe('findAll', () => {
    it('pagina, serializa y arma los meta correctamente', async () => {
      usersRepositoryMock.findAll.mockResolvedValue({
        items: [baseUser],
        total: 25,
      });

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(usersRepositoryMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 10,
          sortField: 'createdAt',
          sortOrder: 'desc',
        }),
      );
      expect(result.items).toHaveLength(1);
      expect(
        (result.items[0] as unknown as { password?: string }).password,
      ).toBeUndefined();
      expect(result.meta).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
    });

    it('ignora un campo de sort no permitido y usa el default', async () => {
      usersRepositoryMock.findAll.mockResolvedValue({ items: [], total: 0 });

      await service.findAll({ page: 1, limit: 10, sort: 'password:asc' });

      // El campo inválido cae al default (createdAt); el orden solicitado
      // (asc) sigue siendo válido y se respeta.
      expect(usersRepositoryMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ sortField: 'createdAt', sortOrder: 'asc' }),
      );
    });
  });

  describe('findByIdOrThrow', () => {
    it('lanza BadRequestException si el id no es un ObjectId válido', async () => {
      await expect(service.findByIdOrThrow('no-valido')).rejects.toThrow(
        BadRequestException,
      );
      expect(usersRepositoryMock.findById).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el usuario no existe', async () => {
      usersRepositoryMock.findById.mockResolvedValue(null);

      await expect(service.findByIdOrThrow(VALID_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('retorna el usuario serializado sin password', async () => {
      usersRepositoryMock.findById.mockResolvedValue(baseUser);

      const result = await service.findByIdOrThrow(VALID_ID);

      expect(result.email).toBe('a@a.com');
      expect(
        (result as unknown as { password?: string }).password,
      ).toBeUndefined();
    });
  });

  describe('update', () => {
    it('lanza ConflictException si el nuevo correo ya lo usa otro usuario', async () => {
      usersRepositoryMock.findById.mockResolvedValue(baseUser);
      usersRepositoryMock.findByEmail.mockResolvedValue({
        ...baseUser,
        id: 'otro-id',
      });

      await expect(
        service.update(VALID_ID, { email: 'ocupado@example.com' }),
      ).rejects.toThrow(ConflictException);

      expect(usersRepositoryMock.update).not.toHaveBeenCalled();
    });

    it('permite mantener su propio correo sin lanzar conflicto', async () => {
      usersRepositoryMock.findById.mockResolvedValue(baseUser);
      usersRepositoryMock.findByEmail.mockResolvedValue(baseUser);
      usersRepositoryMock.update.mockResolvedValue(baseUser);

      await service.update(VALID_ID, { email: 'a@a.com' });

      expect(usersRepositoryMock.update).toHaveBeenCalled();
    });

    it('actualiza y retorna el usuario serializado', async () => {
      usersRepositoryMock.findById.mockResolvedValue(baseUser);
      usersRepositoryMock.update.mockResolvedValue({
        ...baseUser,
        name: 'Nuevo Nombre',
      });

      const result = await service.update(VALID_ID, { name: 'Nuevo Nombre' });

      expect(result.name).toBe('Nuevo Nombre');
    });
  });

  describe('deactivate', () => {
    it('lanza NotFoundException si el usuario no existe', async () => {
      usersRepositoryMock.findById.mockResolvedValue(null);

      await expect(service.deactivate(VALID_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(usersRepositoryMock.deactivate).not.toHaveBeenCalled();
    });

    it('desactiva al usuario existente', async () => {
      usersRepositoryMock.findById.mockResolvedValue(baseUser);

      await service.deactivate(VALID_ID);

      expect(usersRepositoryMock.deactivate).toHaveBeenCalledWith(VALID_ID);
    });
  });
});
