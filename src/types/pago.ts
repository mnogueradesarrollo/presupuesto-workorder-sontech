import type { PaymentMethod, Currency } from './common';

export type Pago = {
  id: string;
  ordenId: string;
  presupuestoId?: string; // opcional
  monto: number;
  moneda: Currency;
  metodo: PaymentMethod;
  cuotas?: number;
  recargoPct?: number;
  referenciaExterna?: string; // MP id/transferencia
  comprobanteTipo?: 'Recibo' | 'Factura A' | 'Factura B' | 'Factura C';
  comprobanteNumero?: string;
  notas?: string;
  createdAt: number;
};
