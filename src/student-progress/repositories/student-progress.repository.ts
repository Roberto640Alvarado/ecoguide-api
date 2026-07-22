import { Injectable } from '@nestjs/common';
import { StudentProgress } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Responsable únicamente del acceso a datos de la colección
 * `student_progress`. Por ahora solo se usa para el flag `completedFlashcards`
 * (las flashcards son la única actividad del recorrido sin un rastro propio
 * en otra colección) — el resto del avance del estudiante (speaking, chatbot,
 * test) se calcula en tiempo real agregando las colecciones ya existentes en
 * StudentProgressService, en vez de duplicarlo aquí.
 */
@Injectable()
export class StudentProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllByStudent(studentId: string): Promise<StudentProgress[]> {
    return this.prisma.studentProgress.findMany({ where: { studentId } });
  }

  findByStudentAndArea(
    studentId: string,
    protectedAreaId: string,
  ): Promise<StudentProgress | null> {
    return this.prisma.studentProgress.findUnique({
      where: { studentId_protectedAreaId: { studentId, protectedAreaId } },
    });
  }

  markFlashcardsCompleted(
    studentId: string,
    protectedAreaId: string,
  ): Promise<StudentProgress> {
    return this.prisma.studentProgress.upsert({
      where: { studentId_protectedAreaId: { studentId, protectedAreaId } },
      create: {
        studentId,
        protectedAreaId,
        completedFlashcards: true,
        lastAccess: new Date(),
      },
      update: { completedFlashcards: true, lastAccess: new Date() },
    });
  }
}
