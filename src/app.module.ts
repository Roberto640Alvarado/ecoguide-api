import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { UsersModule } from './users/users.module';
import { PasswordResetModule } from './password-reset/password-reset.module';
import { AuthModule } from './auth/auth.module';
import { ProtectedAreasModule } from './protected-areas/protected-areas.module';
import { FlashCardsModule } from './flash-cards/flash-cards.module';
import { AIProvidersModule } from './ai-providers/ai-providers.module';
import { SpeakingPracticesModule } from './speaking-practices/speaking-practices.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { SpeakingResultsModule } from './speaking-results/speaking-results.module';
import { ChatbotConversationsModule } from './chatbot-conversations/chatbot-conversations.module';
import { TestsModule } from './tests/tests.module';
import { StudentTestsModule } from './student-tests/student-tests.module';
import { StudentProgressModule } from './student-progress/student-progress.module';
import { BadgesModule } from './badges/badges.module';
import { UploadFilesModule } from './upload-files/upload-files.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { buildLoggerConfig } from './common/config/logger.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: buildLoggerConfig,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: seconds(60),
        limit: 100,
      },
    ]),
    PrismaModule,
    MailModule,
    UsersModule,
    PasswordResetModule,
    AuthModule,
    ProtectedAreasModule,
    FlashCardsModule,
    AIProvidersModule,
    SpeakingPracticesModule,
    ChatbotModule,
    SpeakingResultsModule,
    ChatbotConversationsModule,
    TestsModule,
    StudentTestsModule,
    StudentProgressModule,
    BadgesModule,
    UploadFilesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
