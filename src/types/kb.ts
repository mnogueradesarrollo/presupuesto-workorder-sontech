export type CategoriaKB =
  | 'Notebooks'
  | 'PC Escritorio'
  | 'Placas de Video'
  | 'Motherboards'
  | 'Smartphones'
  | 'BIOS / Firmware'
  | 'General';

export interface ArchivoAdjuntoKB {
  nombre: string;
  url: string;
  tipo: 'esquematico' | 'boardview' | 'bios_bin' | 'foto' | 'documento';
}

export interface ArticuloKB {
  id: string;
  titulo: string;
  categoria: CategoriaKB;
  marcaModelo: string;
  fallaSintoma: string;
  diagnosticoYSolucion: string;
  tags: string[];
  archivosAdjuntos?: ArchivoAdjuntoKB[];
  autor?: string;
  relevanciaVisitas?: number;
  createdAt: number;
  updatedAt: number;
}
