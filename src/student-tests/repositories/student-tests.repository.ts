import { Injectable } from '@nestjs/common';
import { Prisma, StudentTest } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateStudentTestData,
  FindStudentTestsParams,
} from '../types/student-test.type';

/**
 * Responsable únicamente del acceso a datos de la colección
 * `student_tests`. Toda la lógica de negocio (validar intentos, calificar)
 * vive en StudentTestsService.
 */
@Injectable()
export class StudentTestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateStudentTestData): Promise<StudentTest> {
    return this.prisma.studentTest.create({ data });
  }

  countByStudentAndTest(studentId: string, testId: string): Promise<number> {
    return this.prisma.studentTest.count({ where: { studentId, testId } });
  }

  async findAllByStudentAndArea(
    studentId: string,
    protectedAreaId: string,
    params: FindStudentTestsParams,
  ): Promise<{ items: StudentTest[]; total: number }> {
    const { page, limit, sortField, sortOrder } = params;

    const where: Prisma.StudentTestWhereInput = {
      studentId,
      protectedAreaId,
    };

    const [items, total] = await Promise.all([
      this.prisma.studentTest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: sortOrder },
      }),
      this.prisma.studentTest.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Usado por StudentProgress para armar el resumen de un área: cuántos
   * intentos ya usó el estudiante en el examen y su mejor nota.
   */
  async getSummaryByStudentAndTest(
    studentId: string,
    testId: string,
  ): Promise<{ attemptsUsed: number; bestScore: number | null }> {
    const where: Prisma.StudentTestWhereInput = { studentId, testId };

    const [attemptsUsed, best] = await Promise.all([
      this.prisma.studentTest.count({ where }),
      this.prisma.studentTest.findFirst({ where, orderBy: { score: 'desc' } }),
    ]);

    return { attemptsUsed, bestScore: best?.score ?? null };
  }
}
