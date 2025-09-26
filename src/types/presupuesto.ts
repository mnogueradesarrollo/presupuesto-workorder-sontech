import type { Currency, QuoteStatus } from "./common";

export type GarantiaUnidad = "dias" | "meses" | "anios";

export type Aceptacion = {
  nombre: string;
  dni?: string;
  metodo: "firma" | "email" | "whatsapp" | "otro";
  firmaDataUrl?: string;
  aceptadoAt: number; // Date.now()
};

export type ItemPresupuesto = {
  id: string;
  tipo: "Producto" | "Servicio" | "Reparación";
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuentoPct?: number;

  marca?: string;
  modelo?: string;
  imeiSerie?: string;
  estado?: "Nuevo" | "Usado" | "Reacondicionado";
  garantiaMeses?: number; // puedes seguir usándolo si querés
  garantiaValor?: number; // NUEVO
  garantiaUnidad?: GarantiaUnidad; // NUEVO
  nota?: string;

  horas?: number;
  tarifaHora?: number;
};

export type Presupuesto = {
  id: string;
  cliente: string;
  fecha: string; // ISO
  moneda?: Currency;
  items: ItemPresupuesto[];
  anio?: number; // NUEVO
  numero?: number; // NUEVO (incremental por año)
  codigo?: string; // NUEVO "P-YYYY-0001"
  ivaPct?: number;
  recargoTarjetaPct?: number;
  bonificacionPct?: number;
  notas?: string;
  total: number;
  createdAt: number;
  status: QuoteStatus;
  aceptacion?: Aceptacion;
  ordenId?: string;
};
