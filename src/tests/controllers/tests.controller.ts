import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { TestsService } from '../services/tests.service';
import { CreateTestDto } from '../dto/create-test.dto';
import { UpdateTestDto } from '../dto/update-test.dto';
import { TestResponseDoc } from '../doc/test-response.doc';

/**
 * Config del examen del docente (1:1 por área protegida). A diferencia de
 * SpeakingPractices/ChatbotConfigs, este controller está restringido por
 * completo a TEACHER (incluida la lectura): TestResponseDoc incluye
 * `correctAnswer`, que nunca debe llegar al estudiante. El runtime del
 * estudiante para presentar/enviar el examen vive en /student-tests, con su
 * propia representación que omite las respuestas correctas.
 */
@ApiTags('Tests')
@ApiBearerAuth()
@Roles(UserRole.TEACHER)
@Controller('tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Get('by-area/:protectedAreaId')
  @ApiOperation({
    summary: 'Obtiene el examen de un área (null si aún no está configurado).',
  })
  @ApiParam({ name: 'protectedAreaId' })
  @ApiResponse({ status: 200, description: 'Examen encontrado o null.' })
  @ApiResponse({ status: 404, description: 'Área protegida no encontrada.' })
  async findByArea(
    @Param('protectedAreaId') protectedAreaId: string,
  ): Promise<{ message: string; data: TestResponseDoc | null }> {
    const data = await this.testsService.findByProtectedArea(protectedAreaId);

    return { message: 'Examen obtenido correctamente.', data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene el detalle de un examen.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Examen encontrado.' })
  @ApiResponse({ status: 404, description: 'Examen no encontrado.' })
  async findOne(
    @Param('id') id: string,
  ): Promise<{ message: string; data: TestResponseDoc }> {
    const data = await this.testsService.findByIdOrThrow(id);

    return { message: 'Examen obtenido correctamente.', data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea el examen de un área.' })
  @ApiResponse({ status: 201, description: 'Examen creado correctamente.' })
  @ApiResponse({ status: 404, description: 'Área protegida no encontrada.' })
  @ApiResponse({
    status: 409,
    description: 'El área ya tiene un examen configurado.',
  })
  async create(
    @Body() dto: CreateTestDto,
  ): Promise<{ message: string; data: TestResponseDoc }> {
    const data = await this.testsService.create(dto);

    return { message: 'Examen creado correctamente.', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza el examen.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Examen actualizado correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Examen no encontrado.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTestDto,
  ): Promise<{ message: string; data: TestResponseDoc }> {
    const data = await this.testsService.update(id, dto);

    return { message: 'Examen actualizado correctamente.', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desactiva el examen (soft delete, isActive=false).',
  })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Examen desactivado correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Examen no encontrado.' })
  async remove(
    @Param('id') id: string,
  ): Promise<{ message: string; data: null }> {
    await this.testsService.deactivate(id);

    return { message: 'Examen desactivado correctamente.', data: null };
  }
}
