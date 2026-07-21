import { Module } from '@nestjs/common';
import { ChatbotConfigsService } from './services/chatbot-configs.service';
import { ChatbotConfigsRepository } from './repositories/chatbot-configs.repository';
import { ChatbotConfigsController } from './controllers/chatbot-configs.controller';
import { ProtectedAreasModule } from '../protected-areas/protected-areas.module';
import { AIProvidersModule } from '../ai-providers/ai-providers.module';

@Module({
  imports: [ProtectedAreasModule, AIProvidersModule],
  controllers: [ChatbotConfigsController],
  providers: [ChatbotConfigsService, ChatbotConfigsRepository],
  exports: [ChatbotConfigsService],
})
export class ChatbotModule {}
