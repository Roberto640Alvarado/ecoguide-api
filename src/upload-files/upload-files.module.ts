import { Module } from '@nestjs/common';
import { UploadFilesController } from './controllers/upload-files.controller';
import { UploadFilesService } from './services/upload-files.service';

@Module({
  controllers: [UploadFilesController],
  providers: [UploadFilesService],
})
export class UploadFilesModule {}
