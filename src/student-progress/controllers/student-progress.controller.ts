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
