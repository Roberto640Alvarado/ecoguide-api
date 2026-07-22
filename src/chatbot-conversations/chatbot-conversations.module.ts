import { Module } from '@nestjs/common';
import { ChatbotConversationsService } from './services/chatbot-conversations.service';
import { ChatbotConversationsRepository } from './repositories/chatbot-conversations.repository';
import { ChatbotConversationsController } from './controllers/chatbot-conversations.controller';
import { ProtectedAreasModule } from '../protected-areas/protected-areas.module';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { AIProvidersModule } from '../ai-providers/ai-providers.module';

@Module({
  imports: [ProtectedAreasModule, ChatbotModule, AIProvidersModule],
  controllers: [ChatbotConversationsController],
  providers: [ChatbotConversationsService, ChatbotConversationsRepository],
  exports: [ChatbotConversationsService],
})
export class ChatbotConversationsModule {}
