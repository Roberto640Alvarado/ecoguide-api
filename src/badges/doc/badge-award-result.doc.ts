import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { BadgeResponseDoc } from './badge-response.doc';

/**
 * Resultado de revisar/otorgar las insignias de un área para un estudiante
 * (ver StudentProgressService.checkAndAwardBadges). `justUnlocked` solo
 * incluye las insignias que se otorgaron en esta llamada (para disparar el
 * confeti en el frontend una sola vez); `earnedBadges` siempre incluye
 * todas las insignias que el estudiante ya tiene para esa área, se hayan
 * otorgado ahora o antes.
 */
@Exclude()
export class BadgeAwardResultDoc {
  @Expose()
  @ApiProperty()
  completed: boolean;

  @Expose()
  @Type(() => BadgeResponseDoc)
  @ApiProperty({ type: [BadgeResponseDoc] })
  justUnlocked: BadgeResponseDoc[];

  @Expose()
  @Type(() => BadgeResponseDoc)
  @ApiProperty({ type: [BadgeResponseDoc] })
  earnedBadges: BadgeResponseDoc[];
}
