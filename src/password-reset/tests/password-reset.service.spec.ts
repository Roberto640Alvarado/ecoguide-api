import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordResetService } from '../services/password-reset.service';
import { PasswordResetRepository } from '../repositories/password-reset.repository';
import { UsersService } from '../../users/services/users.service';
import { MailService } from '../../mail/services/mail.service';

describe('PasswordResetService', () => {
  let service: PasswordResetService;

  const repositoryMock = {
    create: jest.fn(),
    findValidCode: jest.fn(),
    markAsUsed: jest.fn(),
    invalidateActiveCodesForUser: jest.fn(),
  };

  const usersServiceMock = {
    findByEmail: jest.fn(),
    updatePassword: jest.fn(),
  };

  const mailServiceMock = {
    sendPasswordResetCode: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn().mockReturnValue('15'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    configServiceMock.get.mockReturnValue('15');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: PasswordResetRepository, useValue: repositoryMock },
        { provide: UsersService, useValue: usersServiceMock },
        { provide: MailService, useValue: mailServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get(PasswordResetService);
  });

  describe('requestReset', () => {
    it('no falla ni envía correo si el usuario no existe (evita enumeración)', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(null);

      await service.requestReset('no-existe@example.com');

      expect(repositoryMock.create).not.toHaveBeenCalled();
      expect(mailServiceMock.sendPasswordResetCode).not.toHaveBeenCalled();
    });

    it('invalida códigos previos, crea uno nuevo de 6 dígitos y envía el correo', async () => {
      usersServiceMock.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'a@a.com',
        name: 'Ana',
      });

      await service.requestReset('a@a.com');

      expect(repositoryMock.invalidateActiveCodesForUser).toHaveBeenCalledWith(
        'user-1',
      );
      expect(repositoryMock.create).toHaveBeenCalledTimes(1);

      const [, code] = repositoryMock.create.mock.calls[0];
      expect(code).toMatch(/^\d{6}$/);

      expect(mailServiceMock.sendPasswordResetCode).toHaveBeenCalledWith(
        'a@a.com',
        expect.objectContaining({ name: 'Ana', code, expiresInMinutes: 15 }),
      );
    });
  });

  describe('resetPassword', () => {
    it('lanza BadRequestException si el código es inválido o expiró', async () => {
      repositoryMock.findValidCode.mockResolvedValue(null);

      await expect(
        service.resetPassword('000000', 'NuevaClave123'),
      ).rejects.toThrow(BadRequestException);

      expect(usersServiceMock.updatePassword).not.toHaveBeenCalled();
    });

    it('actualiza el password y marca el código como usado cuando es válido', async () => {
      repositoryMock.findValidCode.mockResolvedValue({
        id: 'code-1',
        userId: 'user-1',
      });

      await service.resetPassword('123456', 'NuevaClave123');

      expect(usersServiceMock.updatePassword).toHaveBeenCalledWith(
        'user-1',
        'NuevaClave123',
      );
      expect(repositoryMock.markAsUsed).toHaveBeenCalledWith('code-1');
    });
  });
});
