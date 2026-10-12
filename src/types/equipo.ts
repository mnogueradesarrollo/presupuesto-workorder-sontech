export type TipoEquipo =
  | 'Notebook'
  | 'PC Escritorio'
  | 'Celular'
  | 'Tablet'
  | 'Impresora'
  | 'Servidor'
  | 'Consola'
  | 'Otro';

export interface EquipoEspecificaciones {
  cpu?: string;
  procesador?: string;
  ram?: string;
  almacenamiento?: string;
  grafica?: string;
  sistemaOperativo?: string;
}

export interface EquipoActivo {
  id: string;
  clienteId: string;
  clienteNombre: string;
  tipo: TipoEquipo;
  marca: string;
  modelo: string;
  numeroSerie: string; // Nro de serie, IMEI o Service Tag
  pinClave?: string; // Contraseña o PIN de desbloqueo
  color?: string;
  especificaciones?: EquipoEspecificaciones;
  historialOrdenesIds?: string[];
  notas?: string;
  createdAt: number;
  updatedAt: number;
}
