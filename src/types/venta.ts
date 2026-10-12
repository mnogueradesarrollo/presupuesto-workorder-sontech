import type { PaymentMethod } from './common';

export interface VentaItem {
  productoId?: string;
  codigo?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  costoUnitario?: number;
  subtotal: number;
}

export type TipoComprobante = 'ticket' | 'recibo' | 'factura_a' | 'factura_b' | 'remito';

export interface Venta {
  id: string;
  codigo: string; // ej: "V-2026-0001"
  anio: number;
  numero: number;
  clienteId?: string;
  clienteNombre: string;
  clienteCuitDni?: string;
  items: VentaItem[];
  subtotal: number;
  descuentoPct?: number;
  descuentoMonto?: number;
  total: number;
  metodoPago: PaymentMethod;
  referenciaPago?: string;
  tipoComprobante: TipoComprobante;
  vendedor?: string;
  notas?: string;
  createdAt: number;
}
