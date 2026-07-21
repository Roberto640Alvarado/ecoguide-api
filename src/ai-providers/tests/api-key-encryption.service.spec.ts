import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ApiKeyEncryptionService } from '../services/api-key-encryption.service';

describe('ApiKeyEncryptionService', () => {
  let service: ApiKeyEncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyEncryptionService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-secret-key-1234567890'),
          },
        },
      ],
    }).compile();

    service = module.get(ApiKeyEncryptionService);
  });

  it('cifra y descifra el mismo valor (roundtrip)', () => {
    const plainText = 'sk-super-secret-api-key';

    const encrypted = service.encrypt(plainText);
    const decrypted = service.decrypt(encrypted);

    expect(encrypted).not.toBe(plainText);
    expect(decrypted).toBe(plainText);
  });

  it('genera un cifrado distinto en cada llamada (iv aleatorio)', () => {
    const plainText = 'sk-super-secret-api-key';

    const first = service.encrypt(plainText);
    const second = service.encrypt(plainText);

    expect(first).not.toBe(second);
    expect(service.decrypt(first)).toBe(plainText);
    expect(service.decrypt(second)).toBe(plainText);
  });

  it('lanza un error si el payload cifrado tiene un formato inválido', () => {
    expect(() => service.decrypt('formato-invalido')).toThrow();
  });
});
