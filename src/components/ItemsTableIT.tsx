import { useMemo } from 'react';
import type { ItemPresupuesto } from '../types/presupuesto';
import { lineTotal } from '../lib/calc';

type Props = { items: ItemPresupuesto[]; onChange: (items: ItemPresupuesto[]) => void; };

export default function ItemsTableIT({ items, onChange }: Props) {
  const total = useMemo(() => items.reduce((a,i)=>a+lineTotal(i),0), [items]);
  const update = (idx: number, patch: Partial<ItemPresupuesto>) => {
    const next = items.slice();
    next[idx] = { ...next[idx], ...patch } as ItemPresupuesto;
    onChange(next);
  };

  return (
    <div className="table-responsive">
      <table className="table items">
        <thead>
          <tr>
            <th>Tipo</th><th>Descripción</th><th>Marca/Modelo</th><th>IMEI/Serie</th>
            <th>Estado</th><th>Garantía</th><th>Cant.</th><th>P. Unit / Horas*Tarifa</th>
            <th>Desc%</th><th>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <tr key={it.id}>
              <td>
                <select value={it.tipo} onChange={e=>update(idx,{tipo:e.target.value as any})}>
                  <option>Producto</option><option>Servicio</option><option>Reparación</option>
                </select>
              </td>
              <td><input value={it.descripcion} onChange={e=>update(idx,{descripcion:e.target.value})}/></td>
              <td>
                <input value={it.marca ?? ''} placeholder="Marca" onChange={e=>update(idx,{marca:e.target.value})}/>
                <input value={it.modelo ?? ''} placeholder="Modelo" onChange={e=>update(idx,{modelo:e.target.value})}/>
              </td>
              <td><input value={it.imeiSerie ?? ''} onChange={e=>update(idx,{imeiSerie:e.target.value})}/></td>
              <td>
                <select value={it.estado ?? ''} onChange={e=>update(idx,{estado:e.target.value as any})}>
                  <option value="">—</option><option>Nuevo</option><option>Usado</option><option>Reacondicionado</option>
                </select>
              </td>
              <td><input type="number" min={0} value={it.garantiaMeses ?? 0}
                         onChange={e=>update(idx,{garantiaMeses:+e.target.value})}/></td>
              <td><input type="number" min={1} value={it.cantidad}
                         onChange={e=>update(idx,{cantidad:+e.target.value})}/></td>
              <td>
                {it.tipo !== 'Producto' ? (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                    <input type="number" placeholder="Horas" value={it.horas ?? 0}
                           onChange={e=>update(idx,{horas:+e.target.value})}/>
                    <input type="number" placeholder="Tarifa" value={it.tarifaHora ?? 0}
                           onChange={e=>update(idx,{tarifaHora:+e.target.value})}/>
                  </div>
                ) : (
                  <input type="number" value={it.precioUnitario}
                         onChange={e=>update(idx,{precioUnitario:+e.target.value})}/>
                )}
              </td>
              <td><input type="number" min={0} max={100} value={it.descuentoPct ?? 0}
                         onChange={e=>update(idx,{descuentoPct:+e.target.value})}/></td>
              <td style={{textAlign:'right'}}>{lineTotal(it).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan={9} style={{textAlign:'right'}}>Subtotal</td>
              <td style={{textAlign:'right'}}>{total.toFixed(2)}</td></tr>
        </tfoot>
      </table>
    </div>
  );
}
