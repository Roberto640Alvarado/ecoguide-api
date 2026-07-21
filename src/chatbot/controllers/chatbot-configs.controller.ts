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
import { ChatbotConfigsService } from '../services/chatbot-configs.service';
import { CreateChatbotConfigDto } from '../dto/create-chatbot-config.dto';
import { UpdateChatbotConfigDto } from '../dto/update-chatbot-config.dto';
import { ChatbotConfigResponseDoc } from '../doc/chatbot-config-response.doc';

/**
 * Config del chatbot del docente (1:1 por área protegida). Lectura
 * disponible para cualquier usuario autenticado (el runtime del estudiante
 * también la necesitará); escritura restringida a TEACHER.
 */
@ApiTags('Chatbot')
@ApiBearerAuth()
@Controller('chatbot-configs')
export class ChatbotConfigsController {
  constructor(private readonly chatbotConfigsService: ChatbotConfigsService) {}

  @Get('by-area/:protectedAreaId')
  @ApiOperation({
    summary:
      'Obtiene la config del chatbot de un área (null si aún no está configurada).',
  })
  @ApiParam({ name: 'protectedAreaId' })
  @ApiResponse({ status: 200, description: 'Config encontrada o null.' })
  @ApiResponse({ status: 404, description: 'Área protegida no encontrada.' })
  async findByArea(
    @Param('protectedAreaId') protectedAreaId: string,
  ): Promise<{ message: string; data: ChatbotConfigResponseDoc | null }> {
    const data =
      await this.chatbotConfigsService.findByProtectedArea(protectedAreaId);

    return { message: 'Config de chatbot obtenida correctamente.', data };
  }

  @Post()
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea la config del chatbot de un área.' })
  @ApiResponse({ status: 201, description: 'Config creada correctamente.' })
  @ApiResponse({ status: 404, description: 'Área protegida no encontrada.' })
  @ApiResponse({
    status: 409,
    description: 'El área ya tiene un chatbot configurado.',
  })
  async create(
    @Body() dto: CreateChatbotConfigDto,
  ): Promise<{ message: string; data: ChatbotConfigResponseDoc }> {
    const data = await this.chatbotConfigsService.create(dto);

    return { message: 'Config de chatbot creada correctamente.', data };
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Actualiza la config del chatbot.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Config actualizada correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Config no encontrada.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateChatbotConfigDto,
  ): Promise<{ message: string; data: ChatbotConfigResponseDoc }> {
    const data = await this.chatbotConfigsService.update(id, dto);

    return { message: 'Config de chatbot actualizada correctamente.', data };
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desactiva la config del chatbot (soft delete, isActive=false).',
  })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Config desactivada correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Config no encontrada.' })
  async remove(
    @Param('id') id: string,
  ): Promise<{ message: string; data: null }> {
    await this.chatbotConfigsService.deactivate(id);

    return {
      message: 'Config de chatbot desactivada correctamente.',
      data: null,
    };
  }
}
