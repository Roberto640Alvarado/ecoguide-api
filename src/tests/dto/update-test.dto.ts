import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTestDto } from './create-test.dto';

export class UpdateTestDto extends PartialType(
  OmitType(CreateTestDto, ['protectedAreaId'] as const),
) {}
