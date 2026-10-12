export type TipoProducto = 'producto' | 'repuesto' | 'consumible' | 'servicio';

export interface Categoria {
  id: string;
  nombre: string;
  tipo: TipoProducto | 'hardware' | 'accesorio' | 'otro';
  descripcion?: string;
  color?: string;
}

export interface Producto {
  id: string;
  codigo: string; // SKU o código de barras
  codigoBarras?: string;
  nombre: string;
  categoriaId: string;
  categoriaNombre: string;
  tipo: TipoProducto;
  costo: number;
  precioVenta: number;
  moneda: 'ARS' | 'USD';
  stock: number;
  stockMinimo: number;
  proveedorId?: string;
  proveedorNombre?: string;
  garantiaMesesProveedor?: number;
  garantiaMesesCliente?: number;
  ubicacionTaller?: string; // ej: "Estante A2", "Gaveta 4"
  activo: boolean;
  createdAt: number;
  updatedAt: number;
}
