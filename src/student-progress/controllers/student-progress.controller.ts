import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { StudentProgressService } from '../services/student-progress.service';
import { StudentAreaProgressDoc } from '../doc/student-area-progress-response.doc';
import { BadgeAwardResultDoc } from '../../badges/doc/badge-award-result.doc';
import { BadgeResponseDoc } from '../../badges/doc/badge-response.doc';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

/**
 * Vista del estudiante sobre su propio avance: cuánto ha hecho en cada área
 * protegida (flashcards, speaking, chatbot, examen). Exclusivo de STUDENT —
 * el docente consulta el detalle real (SpeakingResults, StudentTests, etc.)
 * desde sus propios módulos.
 */
@ApiTags('StudentProgress')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('student-progress')
export class StudentProgressController {
  constructor(
    private readonly studentProgressService: StudentProgressService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista el avance del estudiante en todas las áreas protegidas publicadas.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Avance obtenido correctamente.' })
  async getOverview(
    @Query() query: PaginationQueryDto,
    @User('id') studentId: string,
    @User() requester: AuthenticatedUser,
  ): Promise<{
    message: string;
    data: PaginatedResult<StudentAreaProgressDoc>;
  }> {
    const data = await this.studentProgressService.getOverview(
      studentId,
      requester,
      query,
    );

    return { message: 'Avance obtenido correctamente.', data };
  }

  @Get('by-area/:protectedAreaId')
  @ApiOperation({
    summary: 'Obtiene el avance del estudiante en un área protegida.',
  })
  @ApiParam({ name: 'protectedAreaId' })
  @ApiResponse({ status: 200, description: 'Avance obtenido correctamente.' })
  @ApiResponse({ status: 404, description: 'Área protegida no encontrada.' })
  async getByArea(
    @Param('protectedAreaId') protectedAreaId: string,
    @User('id') studentId: string,
    @User() requester: AuthenticatedUser,
  ): Promise<{ message: string; data: StudentAreaProgressDoc }> {
    const data = await this.studentProgressService.getByArea(
      protectedAreaId,
      studentId,
      requester,
    );

    return { message: 'Avance obtenido correctamente.', data };
  }

  @Post('by-area/:protectedAreaId/flashcards-completed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Marca que el estudiante terminó de ver las flashcards de un área.',
  })
  @ApiParam({ name: 'protectedAreaId' })
  @ApiResponse({
    status: 200,
    description: 'Flashcards marcadas como completadas.',
  })
  @ApiResponse({ status: 404, description: 'Área protegida no encontrada.' })
  async markFlashcardsCompleted(
    @Param('protectedAreaId') protectedAreaId: string,
    @User('id') studentId: string,
    @User() requester: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.studentProgressService.markFlashcardsCompleted(
      protectedAreaId,
      studentId,
      requester,
    );

    return { message: 'Flashcards marcadas como completadas.' };
  }

  @Get('badges')
  @ApiOperation({
    summary:
      'Lista todas las insignias que el estudiante ya obtuvo, en cualquier área.',
  })
  @ApiResponse({
    status: 200,
    description: 'Insignias obtenidas correctamente.',
  })
  async getAllEarnedBadges(
    @User('id') studentId: string,
  ): Promise<{ message: string; data: BadgeResponseDoc[] }> {
    const data =
      await this.studentProgressService.getAllEarnedBadges(studentId);

    return { message: 'Insignias obtenidas correctamente.', data };
  }

  @Get('by-area/:protectedAreaId/badges')
  @ApiOperation({
    summary: 'Lista las insignias que el estudiante ya obtuvo en un área.',
  })
  @ApiParam({ name: 'protectedAreaId' })
  @ApiResponse({
    status: 200,
    description: 'Insignias obtenidas correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Área protegida no encontrada.' })
  async getEarnedBadges(
    @Param('protectedAreaId') protectedAreaId: string,
    @User('id') studentId: string,
    @User() requester: AuthenticatedUser,
  ): Promise<{ message: string; data: BadgeResponseDoc[] }> {
    const data = await this.studentProgressService.getEarnedBadges(
      protectedAreaId,
      studentId,
      requester,
    );

    return { message: 'Insignias obtenidas correctamente.', data };
  }

  @Post('by-area/:protectedAreaId/check-badges')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Revisa si el estudiante terminó el recorrido de un área y, de ser así, le otorga sus insignias.',
  })
  @ApiParam({ name: 'protectedAreaId' })
  @ApiResponse({
    status: 200,
    description: 'Revisión realizada correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Área protegida no encontrada.' })
  async checkBadges(
    @Param('protectedAreaId') protectedAreaId: string,
    @User('id') studentId: string,
    @User() requester: AuthenticatedUser,
  ): Promise<{ message: string; data: BadgeAwardResultDoc }> {
    const data = await this.studentProgressService.checkAndAwardBadges(
      protectedAreaId,
      studentId,
      requester,
    );

    return { message: 'Revisión realizada correctamente.', data };
  }

  @Get('students/:studentId')
  @Roles(UserRole.TEACHER)
  @ApiOperation({
    summary:
      'Lista el avance de un estudiante específico en todas las áreas publicadas (uso del docente).',
  })
  @ApiParam({ name: 'studentId' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Avance obtenido correctamente.' })
  @ApiResponse({ status: 404, description: 'Estudiante no encontrado.' })
  async getOverviewForStudent(
    @Param('studentId') studentId: string,
    @Query() query: PaginationQueryDto,
    @User() requester: AuthenticatedUser,
  ): Promise<{
    message: string;
    data: PaginatedResult<StudentAreaProgressDoc>;
  }> {
    const data = await this.studentProgressService.getOverviewForStudent(
      studentId,
      requester,
      query,
    );

    return { message: 'Avance obtenido correctamente.', data };
  }

  @Get('students/:studentId/by-area/:protectedAreaId')
  @Roles(UserRole.TEACHER)
  @ApiOperation({
    summary:
      'Obtiene el avance de un estudiante específico en un área (uso del docente).',
  })
  @ApiParam({ name: 'studentId' })
  @ApiParam({ name: 'protectedAreaId' })
  @ApiResponse({ status: 200, description: 'Avance obtenido correctamente.' })
  @ApiResponse({
    status: 404,
    description: 'Estudiante o área protegida no encontrados.',
  })
  async getByAreaForStudent(
    @Param('studentId') studentId: string,
    @Param('protectedAreaId') protectedAreaId: string,
    @User() requester: AuthenticatedUser,
  ): Promise<{ message: string; data: StudentAreaProgressDoc }> {
    const data = await this.studentProgressService.getByAreaForStudent(
      protectedAreaId,
      studentId,
      requester,
    );

    return { message: 'Avance obtenido correctamente.', data };
  }
}
