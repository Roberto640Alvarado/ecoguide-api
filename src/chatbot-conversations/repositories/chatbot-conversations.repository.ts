import { Injectable } from '@nestjs/common';
import { ChatbotConversation, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateConversationData,
  FindConversationsParams,
  MessageData,
} from '../types/chatbot-conversation.type';

/**
 * Responsable únicamente del acceso a datos de la colección
 * `chatbot_conversations`. `messages` es un composite type embebido de
 * Prisma (no una colección aparte); `addMessages` usa `push` para agregar al
 * array sin reemplazarlo.
 */
@Injectable()
export class ChatbotConversationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<ChatbotConversation | null> {
    return this.prisma.chatbotConversation.findUnique({ where: { id } });
  }

  create(data: CreateConversationData): Promise<ChatbotConversation> {
    return this.prisma.chatbotConversation.create({ data });
  }

  addMessages(
    id: string,
    messages: MessageData[],
  ): Promise<ChatbotConversation> {
    return this.prisma.chatbotConversation.update({
      where: { id },
      data: { messages: { push: messages } },
    });
  }

  finish(id: string, feedback: string): Promise<ChatbotConversation> {
    return this.prisma.chatbotConversation.update({
      where: { id },
      data: { endedAt: new Date(), feedback },
    });
  }

  async findAllByStudentAndArea(
    studentId: string,
    protectedAreaId: string,
    params: FindConversationsParams,
  ): Promise<{ items: ChatbotConversation[]; total: number }> {
    const { page, limit, sortField, sortOrder } = params;

    const where: Prisma.ChatbotConversationWhereInput = {
      studentId,
      protectedAreaId,
    };

    const [items, total] = await Promise.all([
      this.prisma.chatbotConversation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: sortOrder },
      }),
      this.prisma.chatbotConversation.count({ where }),
    ]);

    return { items, total };
  }
}
