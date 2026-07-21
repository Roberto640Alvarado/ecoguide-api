import { Module } from '@nestjs/common';
import { TestsService } from './services/tests.service';
import { TestsRepository } from './repositories/tests.repository';
import { TestsController } from './controllers/tests.controller';
import { ProtectedAreasModule } from '../protected-areas/protected-areas.module';

@Module({
  imports: [ProtectedAreasModule],
  controllers: [TestsController],
  providers: [TestsService, TestsRepository],
  exports: [TestsService],
})
export class TestsModule {}
