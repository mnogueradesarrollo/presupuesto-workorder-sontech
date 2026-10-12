export interface Proveedor {
  id: string;
  razonSocial: string;
  cuit?: string;
  contactoNombre?: string;
  telefono: string;
  email?: string;
  rubros: string[];
  direccion?: string;
  web?: string;
  plazoGarantiaDiasDefault?: number;
  notas?: string;
  createdAt: number;
}
