import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class MessageResponseDoc {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty({ enum: ['user', 'assistant'] })
  role: string;

  @Expose()
  @ApiProperty()
  message: string;

  @Expose()
  @ApiProperty()
  createdAt: Date;
}
