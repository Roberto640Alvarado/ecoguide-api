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
import { SpeakingPracticesService } from '../services/speaking-practices.service';
import { CreateSpeakingPracticeDto } from '../dto/create-speaking-practice.dto';
import { UpdateSpeakingPracticeDto } from '../dto/update-speaking-practice.dto';
import { SpeakingPracticeResponseDoc } from '../doc/speaking-practice-response.doc';

/**
 * Config de la práctica de speaking del docente (1:1 por área protegida).
 * Lectura disponible para cualquier usuario autenticado (el runtime del
 * estudiante también la necesitará); escritura restringida a TEACHER.
 */
@ApiTags('SpeakingPractices')
@ApiBearerAuth()
@Controller('speaking-practices')
export class SpeakingPracticesController {
  constructor(
    private readonly speakingPracticesService: SpeakingPracticesService,
  ) {}

  @Get('by-area/:protectedAreaId')
  @ApiOperation({
    summary:
      'Obtiene la práctica de speaking de un área (null si aún no está configurada).',
  })
  @ApiParam({ name: 'protectedAreaId' })
  @ApiResponse({ status: 200, description: 'Práctica encontrada o null.' })
  @ApiResponse({ status: 404, description: 'Área protegida no encontrada.' })
  async findByArea(
    @Param('protectedAreaId') protectedAreaId: string,
  ): Promise<{ message: string; data: SpeakingPracticeResponseDoc | null }> {
    const data =
      await this.speakingPracticesService.findByProtectedArea(protectedAreaId);

    return { message: 'Práctica de speaking obtenida correctamente.', data };
  }

  @Post()
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea la práctica de speaking de un área.' })
  @ApiResponse({ status: 201, description: 'Práctica creada correctamente.' })
  @ApiResponse({ status: 404, description: 'Área protegida no encontrada.' })
  @ApiResponse({
    status: 409,
    description: 'El área ya tiene una práctica configurada.',
  })
  async create(
    @Body() dto: CreateSpeakingPracticeDto,
  ): Promise<{ message: string; data: SpeakingPracticeResponseDoc }> {
    const data = await this.speakingPracticesService.create(dto);

    return { message: 'Práctica de speaking creada correctamente.', data };
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Actualiza la práctica de speaking.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Práctica actualizada correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Práctica no encontrada.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSpeakingPracticeDto,
  ): Promise<{ message: string; data: SpeakingPracticeResponseDoc }> {
    const data = await this.speakingPracticesService.update(id, dto);

    return { message: 'Práctica de speaking actualizada correctamente.', data };
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desactiva la práctica de speaking (soft delete, isActive=false).',
  })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Práctica desactivada correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Práctica no encontrada.' })
  async remove(
    @Param('id') id: string,
  ): Promise<{ message: string; data: null }> {
    await this.speakingPracticesService.deactivate(id);

    return {
      message: 'Práctica de speaking desactivada correctamente.',
      data: null,
    };
  }
}
