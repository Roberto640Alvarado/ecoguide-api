import { PartialType } from '@nestjs/swagger';
import { CreateProtectedAreaDto } from './create-protected-area.dto';

export class UpdateProtectedAreaDto extends PartialType(
  CreateProtectedAreaDto,
) {}
