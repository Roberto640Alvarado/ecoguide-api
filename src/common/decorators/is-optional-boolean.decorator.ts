import { applyDecorators } from '@nestjs/common';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Query params booleanos ("?isActive=false") llegan siempre como string, y
 * `@Type(() => Boolean)` de class-transformer es una trampa clásica para
 * este caso: internamente llama al constructor `Boolean(value)`, y
 * `Boolean("false")` es `true` porque cualquier string no vacío es "truthy"
 * en JS. El resultado es que un filtro como `?isActive=false` termina
 * comportándose igual que `?isActive=true` — exactamente el bug reportado
 * en los filtros de estado de Áreas protegidas y Proveedores de IA.
 *
 * Este decorador combinado interpreta explícitamente los strings
 * "true"/"false" (dejando pasar booleans ya nativos, por si el DTO se
 * instancia también fuera de un query string) antes de validarlos.
 */
export function IsOptionalBoolean() {
  return applyDecorators(
    IsOptional(),
    Transform(({ value }: TransformFnParams): unknown => {
      if (typeof value === 'boolean') {
        return value;
      }

      if (value === 'true') {
        return true;
      }

      if (value === 'false') {
        return false;
      }

      return value as unknown;
    }),
    IsBoolean(),
  );
}
