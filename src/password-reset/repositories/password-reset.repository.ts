import { Injectable } from '@nestjs/common';
import { PasswordResetCode } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Responsable únicamente del acceso a datos de `password_reset_codes`.
 */
@Injectable()
export class PasswordResetRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    userId: string,
    code: string,
    expiresAt: Date,
  ): Promise<PasswordResetCode> {
    return this.prisma.passwordResetCode.create({
      data: { userId, code, expiresAt },
    });
  }

  findValidCode(code: string): Promise<PasswordResetCode | null> {
    return this.prisma.passwordResetCode.findFirst({
      where: {
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });
  }

  markAsUsed(id: string): Promise<PasswordResetCode> {
    return this.prisma.passwordResetCode.update({
      where: { id },
      data: { used: true },
    });
  }

  invalidateActiveCodesForUser(userId: string): Promise<{ count: number }> {
    return this.prisma.passwordResetCode.updateMany({
      where: { userId, used: false },
      data: { used: true },
    });
  }
}
