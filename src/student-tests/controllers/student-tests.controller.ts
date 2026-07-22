import {
  Body,
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
import { StudentTestsService } from '../services/student-tests.service';
import { SubmitTestDto } from '../dto/submit-test.dto';
import { StudentTestResponseDoc } from '../doc/student-test-response.doc';
import { StudentTestConfigDoc } from '../doc/student-test-config.doc';
import { TeacherStudentTestResponseDoc } from '../doc/teacher-student-test-response.doc';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

/**
 * Runtime del estudiante para el examen: envía sus respuestas y recibe su
 * nota (calificación + si aprobó). Exclusivo de STUDENT — la config del
 * docente (con las respuestas correctas) vive en /tests.
 */
@ApiTags('StudentTests')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('student-tests')
export class StudentTestsController {
  constructor(private readonly studentTestsService: StudentTestsService) {}

  @Get('config/:protectedAreaId')
  @ApiOperation({
    summary:
      'Obtiene las preguntas del examen para que el estudiante lo resuelva (sin respuestas correctas), más los intentos que ya usó/le quedan.',
  })
  @ApiParam({ name: 'protectedAreaId' })
  @ApiResponse({
    status: 200,
    description: 'Configuración del examen obtenida.',
  })
  @ApiResponse({
    status: 404,
    description: 'Área protegida no encontrada o sin examen configurado.',
  })
  async getConfig(
    @Param('protectedAreaId') protectedAreaId: string,
    @User('id') studentId: string,
    @User() requester: AuthenticatedUser,
  ): Promise<{ message: string; data: StudentTestConfigDoc }> {
    const data = await this.studentTestsService.getConfig(
      protectedAreaId,
      studentId,
      requester,
    );

    return {
      message: 'Configuración del examen obtenida correctamente.',
      data,
    };
  }

  @Get('by-area/:protectedAreaId')
  @ApiOperation({
    summary: 'Lista los intentos de examen del estudiante en un área.',
  })
  @ApiParam({ name: 'protectedAreaId' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description: 'Ej: createdAt:desc, attempt:desc, score:desc',
  })
  @ApiResponse({ status: 200, description: 'Listado paginado de intentos.' })
  async findByArea(
    @Param('protectedAreaId') protectedAreaId: string,
    @Query() query: PaginationQueryDto,
    @User('id') studentId: string,
    @User() requester: AuthenticatedUser,
  ): Promise<{
    message: string;
    data: PaginatedResult<StudentTestResponseDoc>;
  }> {
    const data = await this.studentTestsService.findByArea(
      protectedAreaId,
      studentId,
      requester,
      query,
    );

    return { message: 'Intentos de examen obtenidos correctamente.', data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Envía las respuestas del examen y calcula la nota del intento.',
  })
  @ApiResponse({
    status: 201,
    description: 'Examen calificado y guardado correctamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Área protegida no encontrada o sin examen configurado.',
  })
  @ApiResponse({
    status: 400,
    description: 'Respuestas inválidas o intentos agotados.',
  })
  async submit(
    @Body() dto: SubmitTestDto,
    @User('id') studentId: string,
    @User() requester: AuthenticatedUser,
  ): Promise<{ message: string; data: StudentTestResponseDoc }> {
    const data = await this.studentTestsService.submit(
      dto,
      studentId,
      requester,
    );

    return { message: 'Examen calificado correctamente.', data };
  }

  @Get('teacher/students/:studentId/by-area/:protectedAreaId')
  @Roles(UserRole.TEACHER)
  @ApiOperation({
    summary:
      'Lista los intentos de examen de un estudiante en un área, con el detalle de cada respuesta (uso del docente).',
  })
  @ApiParam({ name: 'studentId' })
  @ApiParam({ name: 'protectedAreaId' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Listado paginado de intentos.' })
  @ApiResponse({
    status: 404,
    description: 'Esta área protegida no tiene un examen configurado.',
  })
  async findByStudentForTeacher(
    @Param('studentId') studentId: string,
    @Param('protectedAreaId') protectedAreaId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<{
    message: string;
    data: PaginatedResult<TeacherStudentTestResponseDoc>;
  }> {
    const data = await this.studentTestsService.findByAreaForTeacher(
      protectedAreaId,
      studentId,
      query,
    );

    return { message: 'Intentos de examen obtenidos correctamente.', data };
  }
}
