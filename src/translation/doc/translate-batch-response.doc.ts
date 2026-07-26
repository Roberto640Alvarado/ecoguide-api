import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class TranslateBatchResponseDoc {
  @Expose()
  @ApiProperty({
    type: [String],
    description: 'Traducciones en el mismo orden que los textos enviados.',
  })
  translations: string[];
}
