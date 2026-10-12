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
  productoId?: string;
  tipo: "Producto" | "Servicio" | "Reparación";
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuentoPct?: number;

  marca?: string;
  modelo?: string;
  imeiSerie?: string;
  estado?: "Nuevo" | "Usado" | "Reacondicionado";
  garantiaMeses?: number;
  garantiaValor?: number;
  garantiaUnidad?: GarantiaUnidad;
  nota?: string;

  horas?: number;
  tarifaHora?: number;
};

export type Presupuesto = {
  id: string;
  cliente: string;
  clienteId?: string;
  clienteTelefono?: string;
  clienteEmail?: string;
  fecha: string; // ISO
  moneda?: Currency;
  items: ItemPresupuesto[];
  anio?: number;
  numero?: number;
  codigo?: string; // "P-YYYY-0001"
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
