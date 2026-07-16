import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { PasswordResetService } from './services/password-reset.service';
import { PasswordResetRepository } from './repositories/password-reset.repository';

@Module({
  imports: [UsersModule],
  providers: [PasswordResetService, PasswordResetRepository],
  exports: [PasswordResetService],
})
export class PasswordResetModule {}
