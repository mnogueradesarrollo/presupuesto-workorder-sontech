export type Currency = 'ARS' | 'USD';

export type PaymentMethod =
  | 'Efectivo'
  | 'Transferencia'
  | 'Débito'
  | 'Crédito'
  | 'MercadoPago'
  | 'Otro';

export type QuoteStatus = 'borrador' | 'enviado' | 'aceptado' | 'rechazado' | 'anulado';
export type WorkStatus =
  | 'pendiente'
  | 'en_progreso'
  | 'esperando_repuestos'
  | 'pausado'
  | 'completado'
  | 'entregado';

export type PayStatus = 'impago' | 'parcial' | 'pagado' | 'reembolsado';
