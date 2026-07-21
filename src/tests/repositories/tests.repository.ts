import { Injectable } from '@nestjs/common';
import { Test } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTestData, UpdateTestData } from '../types/test.type';

/**
 * Responsable únicamente del acceso a datos de la colección `tests`. Toda la
 * lógica de negocio vive en TestsService.
 */
@Injectable()
export class TestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Test | null> {
    return this.prisma.test.findUnique({ where: { id } });
  }

  findByProtectedAreaId(protectedAreaId: string): Promise<Test | null> {
    return this.prisma.test.findUnique({ where: { protectedAreaId } });
  }

  create(data: CreateTestData): Promise<Test> {
    return this.prisma.test.create({
      data: { ...data, isActive: data.isActive ?? true },
    });
  }

  update(id: string, data: UpdateTestData): Promise<Test> {
    return this.prisma.test.update({ where: { id }, data });
  }

  deactivate(id: string): Promise<Test> {
    return this.prisma.test.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
