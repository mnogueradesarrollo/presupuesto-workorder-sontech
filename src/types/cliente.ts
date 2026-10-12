export type TipoCliente = 'particular' | 'empresa';

export type CondicionIva =
  | 'Consumidor Final'
  | 'Responsable Inscripto'
  | 'Monotributo'
  | 'Exento';

export interface Cliente {
  id: string;
  tipo: TipoCliente;
  nombre: string;
  contacto?: string; // Nombre de persona de contacto en empresas
  cuitDni: string;
  telefono: string;
  email: string;
  direccion?: string;
  localidad?: string;
  condicionIva?: CondicionIva;
  notas?: string;
  saldoCuentaCorriente?: number;
  createdAt: number;
  updatedAt: number;
}
