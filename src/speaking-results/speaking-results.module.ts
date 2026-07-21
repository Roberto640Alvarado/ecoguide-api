import { Module } from '@nestjs/common';
import { SpeakingResultsService } from './services/speaking-results.service';
import { SpeakingResultsRepository } from './repositories/speaking-results.repository';
import { SpeakingResultsController } from './controllers/speaking-results.controller';
import { ProtectedAreasModule } from '../protected-areas/protected-areas.module';
import { SpeakingPracticesModule } from '../speaking-practices/speaking-practices.module';
import { AIProvidersModule } from '../ai-providers/ai-providers.module';

@Module({
  imports: [ProtectedAreasModule, SpeakingPracticesModule, AIProvidersModule],
  controllers: [SpeakingResultsController],
  providers: [SpeakingResultsService, SpeakingResultsRepository],
})
export class SpeakingResultsModule {}
