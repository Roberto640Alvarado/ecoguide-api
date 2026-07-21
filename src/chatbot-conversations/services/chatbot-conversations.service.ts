import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { plainToInstance } from 'class-transformer';
import { ChatbotConversation } from '@prisma/client';
import { ChatbotConversationsRepository } from '../repositories/chatbot-conversations.repository';
import { StartConversationDto } from '../dto/start-conversation.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { ChatbotConversationResponseDoc } from '../doc/chatbot-conversation-response.doc';
import {
  CHATBOT_CONVERSATION_SORTABLE_FIELDS,
  MessageData,
} from '../types/chatbot-conversation.type';
import { ProtectedAreasService } from '../../protected-areas/services/protected-areas.service';
import { ChatbotConfigsService } from '../../chatbot/services/chatbot-configs.service';
import { AICompletionService } from '../../ai-providers/services/ai-completion.service';
import { AIChatMessage } from '../../ai-providers/strategies/ai-provider.strategy';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { stripHtml } from '../../common/utils/strip-html.util';
import {
  PaginatedResult,
  parseSort,
} from '../../common/interfaces/paginated-result.interface';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const FEEDBACK_SYSTEM_PROMPT =
  'Eres un evaluador de inglés. Analiza la siguiente conversación entre un estudiante y un chatbot guía turístico de un área protegida. Da retroalimentación breve (2 a 4 oraciones) sobre el desempeño del estudiante en inglés: gramática, vocabulario y fluidez. Responde solo con el texto de la retroalimentación, en español, sin JSON ni formato adicional.';

/**
 * Contiene toda la lógica de negocio de las conversaciones del estudiante
 * con el chatbot de un área. Un estudiante puede tener n conversaciones por
 * área (a diferencia de SpeakingPractice/ChatbotConfig, que son 1:1 del
 * docente); cada conversación se puede finalizar, generando una
 * retroalimentación general vía IA.
 */
@Injectable()
export class ChatbotConversationsService {
  private readonly logger = new Logger(ChatbotConversationsService.name);

  constructor(
    private readonly chatbotConversationsRepository: ChatbotConversationsRepository,
    private readonly protectedAreasService: ProtectedAreasService,
    private readonly chatbotConfigsService: ChatbotConfigsService,
    private readonly aiCompletionService: AICompletionService,
  ) {}

  async start(
    dto: StartConversationDto,
    studentId: string,
    requester: AuthenticatedUser,
  ): Promise<ChatbotConversationResponseDoc> {
    await this.protectedAreasService.findByIdOrThrow(
      dto.protectedAreaId,
      requester,
    );

    const config = await this.chatbotConfigsService.findByProtectedArea(
      dto.protectedAreaId,
    );

    if (!config || !config.isActive) {
      throw new NotFoundException(
        'Esta área protegida no tiene un chatbot configurado.',
      );
    }

    const welcomeMessage: MessageData = {
      id: randomUUID(),
      role: 'assistant',
      message: stripHtml(config.welcomeMessage),
      createdAt: new Date(),
    };

    const conversation = await this.chatbotConversationsRepository.create({
      studentId,
      protectedAreaId: dto.protectedAreaId,
      messages: [welcomeMessage],
    });

    return this.toResponseDoc(conversation);
  }

  async sendMessage(
    id: string,
    dto: SendMessageDto,
    studentId: string,
  ): Promise<ChatbotConversationResponseDoc> {
    const conversation = await this.getOwnedConversationOrThrow(id, studentId);

    if (conversation.endedAt) {
      throw new BadRequestException('Esta conversación ya fue finalizada.');
    }

    const config = await this.chatbotConfigsService.findByProtectedArea(
      conversation.protectedAreaId,
    );

    if (!config || !config.isActive) {
      throw new BadRequestException(
        'El chatbot de esta área ya no está disponible.',
      );
    }

    const systemPrompt = stripHtml(config.systemPrompt);
    const history: AIChatMessage[] = conversation.messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.message,
    }));

    const messages: AIChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: dto.message },
    ];

    const result = await this.aiCompletionService.complete({
      providerId: config.providerId,
      model: config.model,
      messages,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    });

    const userMessage: MessageData = {
      id: randomUUID(),
      role: 'user',
      message: dto.message,
      createdAt: new Date(),
    };
    const assistantMessage: MessageData = {
      id: randomUUID(),
      role: 'assistant',
      message: result.content.trim(),
      createdAt: new Date(),
    };

    const updated = await this.chatbotConversationsRepository.addMessages(id, [
      userMessage,
      assistantMessage,
    ]);

    return this.toResponseDoc(updated);
  }

  async finish(
    id: string,
    studentId: string,
  ): Promise<ChatbotConversationResponseDoc> {
    const conversation = await this.getOwnedConversationOrThrow(id, studentId);

    if (conversation.endedAt) {
      throw new BadRequestException('Esta conversación ya fue finalizada.');
    }

    const feedback = await this.generateClosingFeedback(conversation);

    const updated = await this.chatbotConversationsRepository.finish(
      id,
      feedback,
    );

    return this.toResponseDoc(updated);
  }

  async findByArea(
    protectedAreaId: string,
    studentId: string,
    requester: AuthenticatedUser,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<ChatbotConversationResponseDoc>> {
    await this.protectedAreasService.findByIdOrThrow(
      protectedAreaId,
      requester,
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { field: sortField, order: sortOrder } = parseSort(
      query.sort,
      CHATBOT_CONVERSATION_SORTABLE_FIELDS,
      'startedAt',
    );

    const { items, total } =
      await this.chatbotConversationsRepository.findAllByStudentAndArea(
        studentId,
        protectedAreaId,
        { page, limit, sortField, sortOrder },
      );

    return {
      items: items.map((item) => this.toResponseDoc(item)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findByIdOrThrow(
    id: string,
    studentId: string,
  ): Promise<ChatbotConversationResponseDoc> {
    const conversation = await this.getOwnedConversationOrThrow(id, studentId);

    return this.toResponseDoc(conversation);
  }

  /**
   * Genera la retroalimentación general al finalizar la conversación. Si la
   * config del chatbot ya no existe/está inactiva, o la llamada a la IA
   * falla, se degrada con gracia a un mensaje genérico en vez de bloquear el
   * cierre de la conversación.
   */
  private async generateClosingFeedback(
    conversation: ChatbotConversation,
  ): Promise<string> {
    const config = await this.chatbotConfigsService.findByProtectedArea(
      conversation.protectedAreaId,
    );

    if (!config) {
      return 'Conversación finalizada.';
    }

    const transcript = conversation.messages
      .map(
        (m) =>
          `${m.role === 'assistant' ? 'Guía' : 'Estudiante'}: ${m.message}`,
      )
      .join('\n');

    try {
      const result = await this.aiCompletionService.complete({
        providerId: config.providerId,
        model: config.model,
        messages: [
          { role: 'system', content: FEEDBACK_SYSTEM_PROMPT },
          { role: 'user', content: transcript },
        ],
        temperature: 0.4,
        maxTokens: 400,
      });

      return result.content.trim();
    } catch (error) {
      this.logger.warn(
        `No se pudo generar la retroalimentación de cierre: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );

      return 'Conversación finalizada.';
    }
  }

  private async getOwnedConversationOrThrow(
    id: string,
    studentId: string,
  ): Promise<ChatbotConversation> {
    if (!OBJECT_ID_REGEX.test(id)) {
      throw new BadRequestException('El id proporcionado no es válido.');
    }

    const conversation = await this.chatbotConversationsRepository.findById(id);

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada.');
    }

    if (conversation.studentId !== studentId) {
      throw new ForbiddenException('No tienes acceso a esta conversación.');
    }

    return conversation;
  }

  private toResponseDoc(
    conversation: ChatbotConversation,
  ): ChatbotConversationResponseDoc {
    return plainToInstance(ChatbotConversationResponseDoc, conversation, {
      excludeExtraneousValues: true,
    });
  }
}
