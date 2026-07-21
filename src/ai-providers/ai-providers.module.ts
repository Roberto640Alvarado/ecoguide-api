import { Module } from '@nestjs/common';
import { AIProvidersService } from './services/ai-providers.service';
import { ApiKeyEncryptionService } from './services/api-key-encryption.service';
import { AIProvidersRepository } from './repositories/ai-providers.repository';
import { AIProvidersController } from './controllers/ai-providers.controller';

@Module({
  controllers: [AIProvidersController],
  providers: [
    AIProvidersService,
    ApiKeyEncryptionService,
    AIProvidersRepository,
  ],
  exports: [AIProvidersService],
})
export class AIProvidersModule {}
