import { Module } from '@nestjs/common';
import { TranslationController } from './controllers/translation.controller';
import { TranslationService } from './services/translation.service';
import { DeepLTranslationService } from './services/deepl-translation.service';
import { TranslationRepository } from './repositories/translation.repository';

@Module({
  controllers: [TranslationController],
  providers: [
    TranslationService,
    DeepLTranslationService,
    TranslationRepository,
  ],
})
export class TranslationModule {}
