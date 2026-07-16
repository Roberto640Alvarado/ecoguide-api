import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../../users/services/users.service';
import { PasswordResetService } from '../../password-reset/services/password-reset.service';

describe('AuthService', () => {
  let service: AuthService;

  const usersServiceMock = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    validatePassword: jest.fn(),
  };

  const passwordResetServiceMock = {
    requestReset: jest.fn(),
    resetPassword: jest.fn(),
  };

  const jwtServiceMock = {
    sign: jest.fn().mockReturnValue('signed.jwt.token'),
  };

  const baseUser = {
    id: 'user-1',
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
        AuthService,
        { provide: UsersService, useValue: usersServiceMock },
        { provide: PasswordResetService, useValue: passwordResetServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('crea al usuario como STUDENT y retorna accessToken + user sin password', async () => {
      usersServiceMock.create.mockResolvedValue(baseUser);
      usersServiceMock.findById.mockResolvedValue(baseUser);

      const result = await service.register({
        name: 'Ana',
        lastName: 'Pérez',
        email: 'a@a.com',
        password: 'Secret123',
      });

      expect(usersServiceMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.STUDENT }),
      );
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user.email).toBe('a@a.com');
      expect(
        (result.user as unknown as { password?: string }).password,
      ).toBeUndefined();
    });
  });

  describe('login', () => {
    it('lanza UnauthorizedException si el usuario no existe', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'x@x.com', password: 'Secret123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si el password no coincide', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(baseUser);
      usersServiceMock.validatePassword.mockResolvedValue(false);

      await expect(
        service.login({ email: 'a@a.com', password: 'WrongPass1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si la cuenta está inactiva', async () => {
      usersServiceMock.findByEmail.mockResolvedValue({
        ...baseUser,
        isActive: false,
      });
      usersServiceMock.validatePassword.mockResolvedValue(true);

      await expect(
        service.login({ email: 'a@a.com', password: 'Secret123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('retorna accessToken cuando las credenciales son correctas', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(baseUser);
      usersServiceMock.validatePassword.mockResolvedValue(true);
      usersServiceMock.findById.mockResolvedValue(baseUser);

      const result = await service.login({
        email: 'a@a.com',
        password: 'Secret123',
      });

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user.email).toBe('a@a.com');
    });
  });

  describe('getProfile', () => {
    it('retorna el usuario sin password cuando existe', async () => {
      usersServiceMock.findById.mockResolvedValue(baseUser);

      const result = await service.getProfile('user-1');

      expect(result.email).toBe('a@a.com');
      expect(
        (result as unknown as { password?: string }).password,
      ).toBeUndefined();
    });

    it('lanza UnauthorizedException si el usuario del token ya no existe', async () => {
      usersServiceMock.findById.mockResolvedValue(null);

      await expect(service.getProfile('user-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword / resetPassword', () => {
    it('delega en PasswordResetService', async () => {
      await service.forgotPassword('a@a.com');
      expect(passwordResetServiceMock.requestReset).toHaveBeenCalledWith(
        'a@a.com',
      );

      await service.resetPassword('123456', 'NuevaClave123');
      expect(passwordResetServiceMock.resetPassword).toHaveBeenCalledWith(
        '123456',
        'NuevaClave123',
      );
    });
  });
});
