export type EstadoAbono = 'activo' | 'pausado' | 'cancelado';

export interface ConsumoPeriodo {
  mesAnio: string; // ej: "2026-10"
  horasConsumidas: number;
  visitasRealizadas: number;
  horasExcedentes: number;
  notas?: string;
}

export interface AbonoCliente {
  id: string;
  clienteId: string;
  clienteNombre: string;
  tituloPlan: string;
  costoFijoMensual: number;
  horasIncluidas: number;
  visitasIncluidas: number;
  tarifaHoraExcedente?: number;
  equiposCubiertosIds?: string[];
  diaFacturacion: number; // día 1 al 31 del mes
  estado: EstadoAbono;
  periodoActual: ConsumoPeriodo;
  notas?: string;
  createdAt: number;
  updatedAt: number;
}
