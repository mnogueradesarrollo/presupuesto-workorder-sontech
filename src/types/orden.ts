import type { WorkStatus, PayStatus, Currency } from './common';
import type { ItemPresupuesto } from './presupuesto';

export type Equipo = {
  tipo?: 'Celular' | 'Notebook/PC' | 'Tablet' | 'Impresora' | 'Otro';
  marca?: string;
  modelo?: string;
  imeiSerie?: string;
  pass?: string;         // si el cliente lo facilita
  accesorios?: string;   // ej: funda, cargador, sim
};

export type TrabajoHecho = {
  id: string;
  descripcion: string;
  horas?: number;
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

  itemsPresupuesto?: ItemPresupuesto[]; // snapshot por trazabilidad
  moneda?: Currency;

  status: WorkStatus;
  payStatus: PayStatus;

  garantiaDias?: number;
  notasEntrega?: string; // lo que va al “Informe de Servicio”

  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  deliveredAt?: number;

  totalEstimado?: number;  // desde presupuesto
  totalFinal?: number;     // si cambia (repuestos extra)
  saldo?: number;          // totalFinal - pagos
};
