import { ApiProperty } from '@nestjs/swagger';

export class UploadFileResponseDoc {
  @ApiProperty({
    example:
      'https://res.cloudinary.com/demo/image/upload/v1234567890/ecoguide/protected-areas/abc123.jpg',
  })
  url: string;
}
