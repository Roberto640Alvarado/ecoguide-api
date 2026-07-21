import { Module } from '@nestjs/common';
import { StudentTestsService } from './services/student-tests.service';
import { StudentTestsRepository } from './repositories/student-tests.repository';
import { StudentTestsController } from './controllers/student-tests.controller';
import { ProtectedAreasModule } from '../protected-areas/protected-areas.module';
import { TestsModule } from '../tests/tests.module';

@Module({
  imports: [ProtectedAreasModule, TestsModule],
  controllers: [StudentTestsController],
  providers: [StudentTestsService, StudentTestsRepository],
})
export class StudentTestsModule {}
