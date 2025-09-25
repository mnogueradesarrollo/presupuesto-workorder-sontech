import type { Currency, QuoteStatus } from './common';

export type ItemTipo = 'Producto' | 'Servicio' | 'Reparación';

export type ItemPresupuesto = {
  id: string;
  tipo: ItemTipo;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuentoPct?: number;

  // extras para IT/Celulares (opcionales)
  marca?: string;
  modelo?: string;
  imeiSerie?: string;
  estado?: 'Nuevo' | 'Usado' | 'Reacondicionado';
  garantiaMeses?: number;
  nota?: string;

  // si es servicio/reparación
  horas?: number;
  tarifaHora?: number;
};

export type Aceptacion = {
  nombre: string;
  dni?: string;
  metodo: 'firma' | 'email' | 'whatsapp' | 'otro';
  firmaDataUrl?: string;
  aceptadoAt: number; // Date.now()
};

export type Presupuesto = {
  id: string;
  cliente: string;
  fecha: string; // ISO
  moneda?: Currency;
  items: ItemPresupuesto[];

  ivaPct?: number;
  recargoTarjetaPct?: number;
  bonificacionPct?: number;

  notas?: string;
  total: number;      // si lo persistís
  createdAt: number;

  // NUEVO
  status: QuoteStatus;
  aceptacion?: Aceptacion;
  ordenId?: string;   // id de la OT creada al aceptar
};
