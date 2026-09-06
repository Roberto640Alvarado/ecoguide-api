/**
 * Construye el filtro Prisma `{ gte, lte }` para un rango de fechas de
 * creación a partir de dos strings "yyyy-MM-dd" opcionales (cualquiera de
 * los dos puede faltar, para un rango abierto por ese lado). `to` se lleva
 * al final de ese día (23:59:59.999 UTC) para que sea inclusivo — si no,
 * Prisma interpretaría esa fecha como medianoche y excluiría todo lo creado
 * ese mismo día.
 *
 * Devuelve `undefined` cuando no hay ningún límite, para poder hacer
 * `...(createdAtFilter && { createdAt: createdAtFilter })` en el `where`
 * de cualquier repositorio sin ensuciarlo con lógica de fechas.
 */
export function buildDateRangeFilter(
  from?: string,
  to?: string,
): { gte?: Date; lte?: Date } | undefined {
  if (!from && !to) {
    return undefined;
  }

  const filter: { gte?: Date; lte?: Date } = {};

  if (from) {
    filter.gte = new Date(`${from}T00:00:00.000Z`);
  }

  if (to) {
    filter.lte = new Date(`${to}T23:59:59.999Z`);
  }

  return filter;
}
