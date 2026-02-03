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

  return (
    <div className="items-container-vertical">
      {items.map((it, idx) => (
        <div key={it.id} className="item-card">
          {/* Header del ítem */}
          <div className="item-card-header">
            <span className="badge bg-primary-soft text-primary">Ítem #{idx + 1}</span>
            {!readOnly && (
              <button
                type="button"
                className="btn-action btn-soft-danger"
                onClick={() => remove(idx)}
                title="Eliminar ítem"
              >
                <i className="bi bi-trash"></i>
              </button>
            )}
          </div>

          {/* Cuerpo del ítem (Grid de campos) */}
          <div className="item-grid">
            {/* Fila 1: Básicos */}
            <div className="item-field">
              <label>Tipo</label>
              <select
                {...register(`items.${idx}.tipo`)}
                disabled={readOnly}
                className="form-control"
              >
                <option value="Producto">Producto</option>
                <option value="Servicio">Servicio</option>
                <option value="Reparación">Reparación</option>
              </select>
            </div>

            <div className="item-field" style={{ gridColumn: 'span 2' }}>
              <label>Descripción / Problema</label>
              <input
                {...register(`items.${idx}.descripcion`)}
                disabled={readOnly}
                placeholder="Ej: Cambio de pantalla, Disco sólido 480GB..."
                className={`form-control ${(errors.items as any)?.[idx]?.descripcion ? "is-invalid" : ""}`}
              />
            </div>

            {/* Fila 2: Especificaciones */}
            <div className="item-field">
              <label>Marca / Modelo</label>
              <div className="d-flex gap-2">
                <input
                  {...register(`items.${idx}.marca`)}
                  disabled={readOnly}
                  placeholder="Marca"
                  className="form-control"
                />
                <input
                  {...register(`items.${idx}.modelo`)}
                  disabled={readOnly}
                  placeholder="Modelo"
                  className="form-control"
                />
              </div>
            </div>

            <div className="item-field">
              <label>IMEI / Número de Serie</label>
              <input
                {...register(`items.${idx}.imeiSerie`)}
                disabled={readOnly}
                placeholder="Identificación del dispositivo..."
                className="form-control"
              />
            </div>

            <div className="item-field">
              <label>Estado físico</label>
              <select
                {...register(`items.${idx}.estado`)}
                disabled={readOnly}
                className="form-control"
              >
                <option value="">—</option>
                <option value="Nuevo">Nuevo</option>
                <option value="Usado">Usado</option>
                <option value="Reacondicionado">Reacondicionado</option>
              </select>
            </div>

            {/* Fila 3: Garantía y Cantidad */}
            <div className="item-field">
              <label>Garantía</label>
              <div className="d-flex gap-2">
                <input
                  type="number"
                  min={0}
                  disabled={readOnly}
                  {...register(`items.${idx}.garantiaValor`, { valueAsNumber: true })}
                  className="form-control"
                  style={{ width: '80px' }}
                />
                <select
                  {...register(`items.${idx}.garantiaUnidad`)}
                  disabled={readOnly}
                  className="form-control"
                >
                  {UNIDADES.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="item-field">
              <label>Cantidad</label>
              <input
                type="number"
                min={1}
                disabled={readOnly}
                {...register(`items.${idx}.cantidad`, { valueAsNumber: true })}
                className="form-control"
              />
            </div>

            {/* Fila 4: Precios */}
            <div className="item-field">
              <label>{it.tipo === "Producto" ? "Precio Unitario" : "Horas / Tarifa"}</label>
              {it.tipo !== "Producto" ? (
                <div className="d-flex gap-2">
                  <input
                    type="number"
                    placeholder="Hr"
                    disabled={readOnly}
                    {...register(`items.${idx}.horas`, { valueAsNumber: true })}
                    className="form-control"
                  />
                  <input
                    type="number"
                    placeholder="$$"
                    disabled={readOnly}
                    {...register(`items.${idx}.tarifaHora`, { valueAsNumber: true })}
                    className="form-control"
                  />
                </div>
              ) : (
                <input
                  type="number"
                  disabled={readOnly}
                  {...register(`items.${idx}.precioUnitario`, { valueAsNumber: true })}
                  className="form-control"
                />
              )}
            </div>

            <div className="item-field">
              <label>Descuento (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                disabled={readOnly}
                {...register(`items.${idx}.descuentoPct`, { valueAsNumber: true })}
                className="form-control"
              />
            </div>
          </div>

          {/* Footer del ítem con el subtotal */}
          <div className="item-card-footer">
            <span className="text-muted small">Subtotal ítem:</span>
            <span className="fs-5 fw-bold text-primary">${lineTotal(it).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      ))}

      {/* Resumen total de la lista */}
      <div className="d-flex justify-content-end align-items-center mt-3 p-3 bg-white rounded shadow-sm">
        <span className="text-muted me-3">Subtotal de todos los ítems:</span>
        <span className="fs-4 fw-bold text-gradient">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
}
