import { Module } from '@nestjs/common';
import { SpeakingPracticesService } from './services/speaking-practices.service';
import { SpeakingPracticesRepository } from './repositories/speaking-practices.repository';
import { SpeakingPracticesController } from './controllers/speaking-practices.controller';
import { ProtectedAreasModule } from '../protected-areas/protected-areas.module';
import { AIProvidersModule } from '../ai-providers/ai-providers.module';

@Module({
  imports: [ProtectedAreasModule, AIProvidersModule],
  controllers: [SpeakingPracticesController],
  providers: [SpeakingPracticesService, SpeakingPracticesRepository],
  exports: [SpeakingPracticesService],
})
export class SpeakingPracticesModule {}
