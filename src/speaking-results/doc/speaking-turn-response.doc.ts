import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class SpeakingTurnResponseDoc {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty({ enum: ['assistant', 'user'] })
  role: string;

  @Expose()
  @ApiProperty()
  message: string;

  @Expose()
  @ApiProperty()
  createdAt: Date;
}
