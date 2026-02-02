import { useMemo } from "react";
import type { ItemPresupuesto, GarantiaUnidad } from "../types/presupuesto";
import { lineTotal } from "../lib/calc";
import type { UseFormRegister, FieldErrors } from "react-hook-form";

type Props = {
  items: ItemPresupuesto[];
  register: UseFormRegister<any>;
  remove: (index: number) => void;
  errors: FieldErrors<any>;
  readOnly?: boolean;
};

const UNIDADES: { label: string; value: GarantiaUnidad }[] = [
  { label: "Días", value: "dias" },
  { label: "Meses", value: "meses" },
  { label: "Años", value: "anios" },
];

export default function ItemsTableIT({ items, register, remove, errors, readOnly }: Props) {
  const total = useMemo(
    () => items.reduce((a, i) => a + lineTotal(i), 0),
    [items]
  );

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
                <select {...register(`items.${idx}.tipo`)} disabled={readOnly}>
                  <option value="Producto">Producto</option>
                  <option value="Servicio">Servicio</option>
                  <option value="Reparación">Reparación</option>
                </select>
              </td>

              <td>
                <input
                  {...register(`items.${idx}.descripcion`)}
                  disabled={readOnly}
                  className={(errors.items as any)?.[idx]?.descripcion ? "error" : ""}
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
                    {...register(`items.${idx}.marca`)}
                    disabled={readOnly}
                    placeholder="Marca"
                  />
                  <input
                    {...register(`items.${idx}.modelo`)}
                    disabled={readOnly}
                    placeholder="Modelo"
                  />
                </div>
              </td>

              <td>
                <input
                  {...register(`items.${idx}.imeiSerie`)}
                  disabled={readOnly}
                />
              </td>

              <td>
                <select
                  {...register(`items.${idx}.estado`)}
                  disabled={readOnly}
                >
                  <option value="">—</option>
                  <option value="Nuevo">Nuevo</option>
                  <option value="Usado">Usado</option>
                  <option value="Reacondicionado">Reacondicionado</option>
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
                    disabled={readOnly}
                    {...register(`items.${idx}.garantiaValor`, { valueAsNumber: true })}
                  />
                  <select
                    {...register(`items.${idx}.garantiaUnidad`)}
                    disabled={readOnly}
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
                  disabled={readOnly}
                  {...register(`items.${idx}.cantidad`, { valueAsNumber: true })}
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
                      disabled={readOnly}
                      {...register(`items.${idx}.horas`, { valueAsNumber: true })}
                    />
                    <input
                      type="number"
                      placeholder="Tarifa"
                      disabled={readOnly}
                      {...register(`items.${idx}.tarifaHora`, { valueAsNumber: true })}
                    />
                  </div>
                ) : (
                  <input
                    type="number"
                    disabled={readOnly}
                    {...register(`items.${idx}.precioUnitario`, { valueAsNumber: true })}
                  />
                )}
              </td>

              <td>
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={readOnly}
                  {...register(`items.${idx}.descuentoPct`, { valueAsNumber: true })}
                />
              </td>

              <td style={{ textAlign: "right" }}>{lineTotal(it).toFixed(2)}</td>

              <td className="right">
                {!readOnly && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => remove(idx)}
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
