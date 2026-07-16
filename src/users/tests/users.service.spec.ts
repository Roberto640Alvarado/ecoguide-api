import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from '../services/users.service';
import { UsersRepository } from '../repositories/users.repository';
import { usersRepositoryMock } from './mocks/users-repository.mock';

describe('UsersService', () => {
  let service: UsersService;

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
});
