import type { PaymentMethod, Currency } from "./common";

export type Pago = {
  id: string;
  ordenId: string;
  presupuestoId?: string; // opcional si lo registrás desde el presupuesto
  monto: number;
  moneda: Currency;
  metodo: PaymentMethod; // 'efectivo' | 'tarjeta' | 'transferencia' | 'otro'
  cuotas?: number;
  recargoPct?: number;
  referenciaExterna?: string; // MP id / nro de transferencia / etc.
  comprobanteTipo?: "Recibo" | "Factura A" | "Factura B" | "Factura C";
  comprobanteNumero?: string;
  createdAt: number;
};
