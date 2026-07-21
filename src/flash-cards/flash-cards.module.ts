import { Module } from '@nestjs/common';
import { FlashCardsService } from './services/flash-cards.service';
import { FlashCardsRepository } from './repositories/flash-cards.repository';
import { FlashCardsController } from './controllers/flash-cards.controller';
import { ProtectedAreasModule } from '../protected-areas/protected-areas.module';

@Module({
  imports: [ProtectedAreasModule],
  controllers: [FlashCardsController],
  providers: [FlashCardsService, FlashCardsRepository],
  exports: [FlashCardsService],
})
export class FlashCardsModule {}
