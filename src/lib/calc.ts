import type { ItemPresupuesto, Presupuesto } from '../types/presupuesto';

export function lineTotal(it: ItemPresupuesto): number {
  const unit = (it.horas && it.tarifaHora) ? it.horas * it.tarifaHora : it.precioUnitario;
  const desc = it.descuentoPct ? (unit * it.descuentoPct) / 100 : 0;
  return (unit - desc) * (it.cantidad || 1);
}

export const subtotal = (items: ItemPresupuesto[]) =>
  items.reduce((a, i) => a + lineTotal(i), 0);

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
