import { Module } from '@nestjs/common';
import { StudentProgressService } from './services/student-progress.service';
import { StudentProgressRepository } from './repositories/student-progress.repository';
import { StudentProgressController } from './controllers/student-progress.controller';
import { ProtectedAreasModule } from '../protected-areas/protected-areas.module';
import { FlashCardsModule } from '../flash-cards/flash-cards.module';
import { SpeakingPracticesModule } from '../speaking-practices/speaking-practices.module';
import { SpeakingResultsModule } from '../speaking-results/speaking-results.module';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { ChatbotConversationsModule } from '../chatbot-conversations/chatbot-conversations.module';
import { TestsModule } from '../tests/tests.module';
import { StudentTestsModule } from '../student-tests/student-tests.module';
import { UsersModule } from '../users/users.module';
import { BadgesModule } from '../badges/badges.module';

@Module({
  imports: [
    ProtectedAreasModule,
    FlashCardsModule,
    SpeakingPracticesModule,
    SpeakingResultsModule,
    ChatbotModule,
    ChatbotConversationsModule,
    TestsModule,
    StudentTestsModule,
    UsersModule,
    BadgesModule,
  ],
  controllers: [StudentProgressController],
  providers: [StudentProgressService, StudentProgressRepository],
})
export class StudentProgressModule {}
