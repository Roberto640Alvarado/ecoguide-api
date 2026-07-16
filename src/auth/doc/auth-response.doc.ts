import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { UserResponseDoc } from '../../users/doc/user-response.doc';

export class AuthResponseDoc {
  @Expose()
  @ApiProperty()
  accessToken: string;

  @Expose()
  @Type(() => UserResponseDoc)
  @ApiProperty({ type: UserResponseDoc })
  user: UserResponseDoc;
}
