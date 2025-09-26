import { useMemo } from "react";
import type { ItemPresupuesto, GarantiaUnidad } from "../types/presupuesto";
import { lineTotal } from "../lib/calc";

type Props = {
  items: ItemPresupuesto[];
  onChange: (items: ItemPresupuesto[]) => void;
  onRemoveItem?: (id: string) => void;
};

const UNIDADES: { label: string; value: GarantiaUnidad }[] = [
  { label: "Días", value: "dias" },
  { label: "Meses", value: "meses" },
  { label: "Años", value: "anios" },
];

export default function ItemsTableIT({ items, onChange, onRemoveItem }: Props) {
  const total = useMemo(
    () => items.reduce((a, i) => a + lineTotal(i), 0),
    [items]
  );

  const update = (idx: number, patch: Partial<ItemPresupuesto>) => {
    const next = items.slice();
    next[idx] = { ...next[idx], ...patch } as ItemPresupuesto;
    onChange(next);
  };

  const COLS = [
    "140px" /* Tipo */,
    "300px" /* Descripción */,
    "130px" /* Marca/Modelo */,
    "160px" /* IMEI/Serie */,
    "120px" /* Estado */,
    "190px" /* Garantía */,
    "80px" /* Cant. */,
    "220px" /* P. Unit / Horas*Tarifa */,
    "90px" /* Desc% */,
    "120px" /* Total */,
    "60px" /* Acciones */,
  ];

  return (
    <div className="table-responsive">
      <table className="table items" style={{ tableLayout: "fixed" }}>
        <colgroup>
          {COLS.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>

        <thead>
          <tr>
            <th>Tipo</th>
            <th>Descripción</th>
            <th>Marca/Modelo</th>
            <th>IMEI/Serie</th>
            <th>Estado</th>
            <th>Garantía</th>
            <th>Cant.</th>
            <th>P. Unit / Horas*Tarifa</th>
            <th>Desc%</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {items.map((it, idx) => (
            <tr key={it.id}>
              <td>
                <select
                  value={it.tipo}
                  onChange={(e) => update(idx, { tipo: e.target.value as any })}
                >
                  <option>Producto</option>
                  <option>Servicio</option>
                  <option>Reparación</option>
                </select>
              </td>

              <td>
                <input
                  value={it.descripcion}
                  onChange={(e) => update(idx, { descripcion: e.target.value })}
                />
              </td>

              <td>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: 6,
                  }}
                >
                  <input
                    value={it.marca ?? ""}
                    placeholder="Marca"
                    onChange={(e) => update(idx, { marca: e.target.value })}
                  />
                  <input
                    value={it.modelo ?? ""}
                    placeholder="Modelo"
                    onChange={(e) => update(idx, { modelo: e.target.value })}
                  />
                </div>
              </td>

              <td>
                <input
                  value={it.imeiSerie ?? ""}
                  onChange={(e) => update(idx, { imeiSerie: e.target.value })}
                />
              </td>

              <td>
                <select
                  value={it.estado ?? ""}
                  onChange={(e) =>
                    update(idx, { estado: e.target.value as any })
                  }
                >
                  <option value="">—</option>
                  <option>Nuevo</option>
                  <option>Usado</option>
                  <option>Reacondicionado</option>
                </select>
              </td>

              <td>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 6,
                  }}
                >
                  <input
                    type="number"
                    min={0}
                    value={it.garantiaValor ?? 0}
                    onChange={(e) =>
                      update(idx, { garantiaValor: +e.target.value })
                    }
                  />
                  <select
                    value={it.garantiaUnidad ?? "meses"}
                    onChange={(e) =>
                      update(idx, { garantiaUnidad: e.target.value as any })
                    }
                  >
                    {UNIDADES.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </td>

              <td>
                <input
                  type="number"
                  min={1}
                  value={it.cantidad}
                  onChange={(e) => update(idx, { cantidad: +e.target.value })}
                />
              </td>

              <td>
                {it.tipo !== "Producto" ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 6,
                    }}
                  >
                    <input
                      type="number"
                      placeholder="Horas"
                      value={it.horas ?? 0}
                      onChange={(e) => update(idx, { horas: +e.target.value })}
                    />
                    <input
                      type="number"
                      placeholder="Tarifa"
                      value={it.tarifaHora ?? 0}
                      onChange={(e) =>
                        update(idx, { tarifaHora: +e.target.value })
                      }
                    />
                  </div>
                ) : (
                  <input
                    type="number"
                    value={it.precioUnitario}
                    onChange={(e) =>
                      update(idx, { precioUnitario: +e.target.value })
                    }
                  />
                )}
              </td>

              <td>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={it.descuentoPct ?? 0}
                  onChange={(e) =>
                    update(idx, { descuentoPct: +e.target.value })
                  }
                />
              </td>

              <td style={{ textAlign: "right" }}>{lineTotal(it).toFixed(2)}</td>

              <td className="right">
                {onRemoveItem && (
                  <button
                    className="btn"
                    onClick={() => onRemoveItem(it.id)}
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr>
            <td colSpan={9} className="right">
              Subtotal
            </td>
            <td className="right">{total.toFixed(2)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
