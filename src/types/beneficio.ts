export type EstadoTurnoBeneficio =
  | 'pendiente_recepcion'
  | 'recepcionado'
  | 'en_mantenimiento'
  | 'listo_entrega'
  | 'entregado'
  | 'cancelado';

export interface ClienteTurnoBeneficio {
  nombre: string;
  apellido: string;
  dni: string;
  domicilio: string;
  email: string;
  telefono: string;
}

export interface EquipoTurnoBeneficio {
  tipo: 'Notebook' | 'PC de Escritorio' | string;
  marca: string;
  modelo: string;
  observaciones?: string;
  numeroSerie?: string;
}

export interface TurnoBeneficio {
  id: string;
  cliente: ClienteTurnoBeneficio;
  equipo: EquipoTurnoBeneficio;
  fechaTurno: string; // YYYY-MM-DD
  franjaHoraria: string;
  fechaEntregaEstimada: string; // YYYY-MM-DD
  estado: EstadoTurnoBeneficio;
  codigoUnico?: string | null;
  ordenId?: string;
  tokenTracking?: string;
  tipoBeneficio: string;
  notasRecepcion?: string;
  creadoEn: string;
  recepcionadoEn?: string;
  actualizadoEn?: string;
}
