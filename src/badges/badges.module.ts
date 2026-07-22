import { Module } from '@nestjs/common';
import { BadgesService } from './services/badges.service';
import { BadgesRepository } from './repositories/badges.repository';
import { BadgesController } from './controllers/badges.controller';
import { ProtectedAreasModule } from '../protected-areas/protected-areas.module';

@Module({
  imports: [ProtectedAreasModule],
  controllers: [BadgesController],
  providers: [BadgesService, BadgesRepository],
  exports: [BadgesService],
})
export class BadgesModule {}
