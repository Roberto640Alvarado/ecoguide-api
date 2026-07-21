import { Injectable } from '@nestjs/common';
import { ChatbotConfig } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateChatbotConfigData,
  UpdateChatbotConfigData,
} from '../types/chatbot-config.type';

const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 2048;

/**
 * Responsable únicamente del acceso a datos de la colección
 * `chatbot_configs`. Toda la lógica de negocio vive en ChatbotConfigsService.
 */
@Injectable()
export class ChatbotConfigsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<ChatbotConfig | null> {
    return this.prisma.chatbotConfig.findUnique({ where: { id } });
  }

  findByProtectedAreaId(
    protectedAreaId: string,
  ): Promise<ChatbotConfig | null> {
    return this.prisma.chatbotConfig.findUnique({ where: { protectedAreaId } });
  }

  create(data: CreateChatbotConfigData): Promise<ChatbotConfig> {
    return this.prisma.chatbotConfig.create({
      data: {
        ...data,
        temperature: data.temperature ?? DEFAULT_TEMPERATURE,
        maxTokens: data.maxTokens ?? DEFAULT_MAX_TOKENS,
        isActive: data.isActive ?? true,
      },
    });
  }

  update(id: string, data: UpdateChatbotConfigData): Promise<ChatbotConfig> {
    return this.prisma.chatbotConfig.update({ where: { id }, data });
  }

  deactivate(id: string): Promise<ChatbotConfig> {
    return this.prisma.chatbotConfig.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
