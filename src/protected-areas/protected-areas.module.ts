import { Module } from '@nestjs/common';
import { ProtectedAreasService } from './services/protected-areas.service';
import { ProtectedAreasRepository } from './repositories/protected-areas.repository';
import { ProtectedAreasController } from './controllers/protected-areas.controller';

@Module({
  controllers: [ProtectedAreasController],
  providers: [ProtectedAreasService, ProtectedAreasRepository],
  exports: [ProtectedAreasService],
})
export class ProtectedAreasModule {}
