import type { ItemPresupuesto, Presupuesto } from '../types/presupuesto';

export function lineTotal(it: ItemPresupuesto): number {
  let unit = 0;
  const horas = Number(it.horas);
  const tarifa = Number(it.tarifaHora);
  const precio = Number(it.precioUnitario);

  if (!isNaN(horas) && horas > 0 && !isNaN(tarifa) && tarifa > 0) {
    unit = horas * tarifa;
  } else if (!isNaN(precio) && precio >= 0) {
    unit = precio;
  } else if (!isNaN(tarifa) && tarifa >= 0) {
    unit = tarifa;
  }

  const descPct = Number(it.descuentoPct);
  const desc = (!isNaN(descPct) && descPct > 0) ? (unit * descPct) / 100 : 0;
  const cant = Number(it.cantidad);
  const cantFinal = (!isNaN(cant) && cant > 0) ? cant : 1;
  const total = (unit - desc) * cantFinal;
  return isNaN(total) ? 0 : total;
}

export const subtotal = (items: ItemPresupuesto[]) =>
  (items || []).reduce((a, i) => a + lineTotal(i), 0);

export function totals(p: Pick<Presupuesto, 'items' | 'ivaPct' | 'recargoTarjetaPct' | 'bonificacionPct'>) {
  const sub = subtotal(p.items);
  const bonif = p.bonificacionPct ? (sub * p.bonificacionPct) / 100 : 0;
  const sub2 = sub - bonif;
  const recargo = p.recargoTarjetaPct ? (sub2 * p.recargoTarjetaPct) / 100 : 0;
  const base = sub2 + recargo;
  const iva = p.ivaPct ? (base * p.ivaPct) / 100 : 0;
  const total = base + iva;
  return { sub, bonif, recargo, iva, total };
}
