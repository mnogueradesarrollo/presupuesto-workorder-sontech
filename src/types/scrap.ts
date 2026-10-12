export type TipoItemTaller = 'consumible' | 'scrap';

export interface PiezaRecuperada {
  id: string;
  descripcion: string;
  estado: 'operativo' | 'reparable' | 'para_pruebas';
  usadoEnOrdenId?: string;
  usadoEnOrdenCodigo?: string;
  fechaUso?: number;
}

export interface ItemConsumibleScrap {
  id: string;
  tipo: TipoItemTaller;
  nombre: string;
  categoria?: string;
  origenDonacion?: string; // Para scrap: ej "Notebook Lenovo B590 donada"
  cantidadDisponible: number;
  unidadMedida: 'unidades' | 'gramos' | 'ml' | 'jeringas' | 'pack';
  piezasRecuperadas?: PiezaRecuperada[];
  ubicacion?: string;
  costoEstimado?: number;
  notas?: string;
  createdAt: number;
  updatedAt: number;
}
