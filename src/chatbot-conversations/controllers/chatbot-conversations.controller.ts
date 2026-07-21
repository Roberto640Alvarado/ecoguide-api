import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { ChatbotConversationsService } from '../services/chatbot-conversations.service';
import { StartConversationDto } from '../dto/start-conversation.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { ChatbotConversationResponseDoc } from '../doc/chatbot-conversation-response.doc';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

/**
 * Runtime del estudiante para el chatbot: puede tener varias conversaciones
 * por área (a diferencia de la config 1:1 del docente en /chatbot-configs).
 * Exclusivo de STUDENT.
 */
@ApiTags('ChatbotConversations')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('chatbot-conversations')
export class ChatbotConversationsController {
  constructor(
    private readonly chatbotConversationsService: ChatbotConversationsService,
  ) {}

  @Get('by-area/:protectedAreaId')
  @ApiOperation({
    summary: 'Lista las conversaciones del estudiante en un área.',
  })
  @ApiParam({ name: 'protectedAreaId' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description: 'Ej: startedAt:desc',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado paginado de conversaciones.',
  })
  async findByArea(
    @Param('protectedAreaId') protectedAreaId: string,
    @Query() query: PaginationQueryDto,
    @User('id') studentId: string,
    @User() requester: AuthenticatedUser,
  ): Promise<{
    message: string;
    data: PaginatedResult<ChatbotConversationResponseDoc>;
  }> {
    const data = await this.chatbotConversationsService.findByArea(
      protectedAreaId,
      studentId,
      requester,
      query,
    );

    return { message: 'Conversaciones obtenidas correctamente.', data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene el detalle de una conversación.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Conversación encontrada.' })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada.' })
  async findOne(
    @Param('id') id: string,
    @User('id') studentId: string,
  ): Promise<{ message: string; data: ChatbotConversationResponseDoc }> {
    const data = await this.chatbotConversationsService.findByIdOrThrow(
      id,
      studentId,
    );

    return { message: 'Conversación obtenida correctamente.', data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Inicia una nueva conversación con el chatbot de un área.',
  })
  @ApiResponse({
    status: 201,
    description: 'Conversación iniciada correctamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Área protegida no encontrada o sin chatbot configurado.',
  })
  async start(
    @Body() dto: StartConversationDto,
    @User('id') studentId: string,
    @User() requester: AuthenticatedUser,
  ): Promise<{ message: string; data: ChatbotConversationResponseDoc }> {
    const data = await this.chatbotConversationsService.start(
      dto,
      studentId,
      requester,
    );

    return { message: 'Conversación iniciada correctamente.', data };
  }

  @Post(':id/messages')
  @ApiOperation({
    summary:
      'Envía un mensaje del estudiante y obtiene la respuesta del chatbot.',
  })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Respuesta generada correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada.' })
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @User('id') studentId: string,
  ): Promise<{ message: string; data: ChatbotConversationResponseDoc }> {
    const data = await this.chatbotConversationsService.sendMessage(
      id,
      dto,
      studentId,
    );

    return { message: 'Mensaje enviado correctamente.', data };
  }

  @Patch(':id/finish')
  @ApiOperation({
    summary: 'Finaliza la conversación y genera una retroalimentación general.',
  })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Conversación finalizada correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Conversación no encontrada.' })
  async finish(
    @Param('id') id: string,
    @User('id') studentId: string,
  ): Promise<{ message: string; data: ChatbotConversationResponseDoc }> {
    const data = await this.chatbotConversationsService.finish(id, studentId);

    return { message: 'Conversación finalizada correctamente.', data };
  }
}
