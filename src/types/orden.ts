import type { WorkStatus, PayStatus, Currency } from "./common";
import type { ItemPresupuesto } from "./presupuesto";
import type { Pago } from "./pago";

export type Equipo = {
  tipo?: "Celular" | "Notebook/PC" | "Tablet" | "Impresora" | "Otro";
  marca?: string;
  modelo?: string;
  imeiSerie?: string;
  pass?: string; // si el cliente lo facilita
  accesorios?: string; // ej: funda, cargador, sim
};

export type TrabajoHecho = {
  id: string;
  descripcion: string;
  horas?: number;
  precio?: number;
  tecnico?: string;
};

export type RepuestoUsado = {
  id: string;
  descripcion: string;
  cantidad: number;
  costo?: number;
  precio?: number;
  serieLote?: string;
};

export type Orden = {
  id: string;
  presupuestoId: string;
  cliente: string;

  equipo: Equipo;
  diagnostico?: string;
  trabajos: TrabajoHecho[];
  repuestos: RepuestoUsado[];

  /** Snapshot del presupuesto al momento de aceptar (trazabilidad) */
  itemsPresupuesto?: ItemPresupuesto[];
  moneda?: Currency;

  /** Estado de la orden y del pago */
  status: WorkStatus; // p.ej. 'pendiente' | 'en_proceso' | 'completado' | 'anulado'
  payStatus: PayStatus; // p.ej. 'impago' | 'parcial' | 'pagado'

  garantiaDias?: number;
  /** Notas internas o mensaje que se imprime en el Informe de Servicio */
  notasEntrega?: string;
  /** Comentarios/observaciones generales (opcional) */
  notas?: string;

  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  deliveredAt?: number;

  /** Importes */
  totalEstimado?: number; // tomado del presupuesto
  totalFinal?: number; // si cambia (repuestos extra/horas)
  saldo?: number; // totalFinal o estimado - pagos
  pagado?: number; // total pagado acumulado

  /** Numeración */
  codigo?: string;
  anio?: number;
  numero?: number;

  /** Si querés guardar pagos embebidos (no obligatorio; también hay colección 'pagos') */
  pagos?: Pago[];
};
